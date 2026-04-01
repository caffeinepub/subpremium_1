import { useAuth } from "@/context/AuthContext";
import { useVideos } from "@/context/VideoContext";
import { useActor } from "@/hooks/useActor";
import { useUploadEngine } from "@/hooks/useUploadEngine";
import { Film, ImageIcon, Link2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const INPUT_STYLE = {
  background: "oklch(0.22 0.006 264)",
  border: "1px solid oklch(0.28 0.006 264)",
  color: "oklch(0.96 0.005 264)",
} as const;

const LABEL_STYLE = {
  color: "oklch(0.72 0.005 264)",
} as const;

const RED = "oklch(0.548 0.222 27)";
const MUTED = "oklch(0.72 0.005 264)";

interface UploadPageProps {
  onNavigate?: (route: string) => void;
}

export default function UploadPage({ onNavigate }: UploadPageProps) {
  const { authUser } = useAuth();
  const { actor } = useActor();
  const { addVideo, updateVideo, removeVideo } = useVideos();
  const { uploadState, progress, statusText, errorMsg, startUpload, reset } =
    useUploadEngine();

  const [uploadMode, setUploadMode] = useState<"file" | "url">("url");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [hlsUrl, setHlsUrl] = useState("");

  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState("");
  const [urlSubmitting, setUrlSubmitting] = useState(false);

  const thumbRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uploadState === "done") {
      setTitle("");
      setDescription("");
      setThumbnail(null);
      setVideo(null);
      setHlsUrl("");
      setFormError("");
    }
  }, [uploadState]);

  const isInProgress =
    uploadState === "uploading" || uploadState === "processing";

  // ── FILE MODE: chunked upload to ICP backend ──
  // Blob URL used as instant fallback; replaced by permanent server URL on success.
  const handleFileSubmit = () => {
    setFormError("");
    if (!authUser) {
      onNavigate?.("login");
      return;
    }
    if (!video) {
      setFormError("Please select a video file.");
      return;
    }
    if (video.size === 0) {
      setFormError("Invalid file (empty).");
      return;
    }
    if (video.size > 2 * 1024 * 1024 * 1024) {
      setFormError("Max file size is 2GB.");
      return;
    }
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!thumbnail) {
      setFormError("Please select a thumbnail image.");
      return;
    }

    startUpload({
      file: video,
      title,
      description,
      thumbnail,
      hlsUrl: hlsUrl.trim() || undefined,
    });
    onNavigate?.("home");
  };

  // ── URL MODE ──
  const handleUrlSubmit = async () => {
    setFormError("");
    if (!authUser) {
      onNavigate?.("login");
      return;
    }
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!videoUrl.trim()) {
      setFormError("Video URL is required.");
      return;
    }
    try {
      new URL(videoUrl.trim());
    } catch {
      setFormError(
        "Please enter a valid URL (must start with https:// or http://).",
      );
      return;
    }
    if (!actor) {
      setFormError("Not connected to the network. Please try again.");
      return;
    }

    setUrlSubmitting(true);

    const isHls =
      videoUrl.trim().endsWith(".m3u8") ||
      videoUrl.trim().includes("/master.m3u8") ||
      videoUrl.trim().includes(".m3u8?");
    const finalVideoUrl = isHls ? "" : videoUrl.trim();
    const finalHlsUrl = isHls ? videoUrl.trim() : null;
    const thumbUrl = thumbnailUrlInput.trim() || "";

    const tempId = crypto.randomUUID();
    addVideo({
      id: tempId,
      title: title.trim(),
      creator: authUser.name || authUser.username,
      username: authUser.username,
      ownerId: authUser.id,
      views: 0,
      description: description.trim(),
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      thumbnailUrl: thumbUrl,
      videoUrl: finalVideoUrl || videoUrl.trim(),
      hlsUrl: finalHlsUrl || undefined,
      duration: "",
      status: "READY",
      uploading: false,
    });

    onNavigate?.("home");

    try {
      const videoId = await actor.addVideoUrl(
        title.trim(),
        description.trim(),
        thumbUrl,
        finalVideoUrl,
        authUser.username || authUser.name || "",
        finalHlsUrl,
      );
      updateVideo(tempId, { id: videoId });
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setThumbnailUrlInput("");
      toast.success("Video added to feed!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save video.";
      removeVideo(tempId);
      toast.error(msg);
    } finally {
      setUrlSubmitting(false);
    }
  };

  return (
    <div className="animate-page-in py-6 px-1" data-ocid="upload.section">
      <h2 className="text-xl font-bold text-foreground mb-4">Upload Video</h2>

      {/* Mode Toggle */}
      <div
        className="flex rounded-xl overflow-hidden mb-6"
        style={{
          background: "oklch(0.20 0.006 264)",
          border: "1px solid oklch(0.28 0.006 264)",
        }}
        data-ocid="upload.mode_toggle"
      >
        {(["file", "url"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className="flex-1 h-11 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
            style={
              uploadMode === mode
                ? { background: RED, color: "#fff" }
                : { color: MUTED, background: "transparent" }
            }
            onClick={() => {
              setUploadMode(mode);
              setFormError("");
            }}
            data-ocid={`upload.mode_${mode}`}
          >
            {mode === "file" ? (
              <Film className="w-4 h-4" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {mode === "file" ? "Upload File" : "Paste URL"}
          </button>
        ))}
      </div>

      {/* Upload progress (file mode) */}
      {uploadMode === "file" && isInProgress && (
        <div
          className="mb-5 rounded-2xl overflow-hidden"
          style={{
            background: "oklch(0.20 0.006 264)",
            border: "1px solid oklch(0.28 0.006 264)",
          }}
          data-ocid="upload.loading_state"
        >
          <div
            className="relative h-1.5 w-full"
            style={{ background: "oklch(0.16 0.004 264)" }}
          >
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%`, background: RED }}
            />
            {uploadState === "processing" && (
              <div
                className="absolute inset-0 upload-shimmer"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${RED}60 50%, transparent 100%)`,
                }}
              />
            )}
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <Loader2
              className="w-4 h-4 animate-spin shrink-0"
              style={{ color: RED }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.96 0.005 264)" }}
              >
                {statusText ||
                  (uploadState === "processing"
                    ? "Processing..."
                    : `Uploading ${progress}%`)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                Video is playable now — permanent URL saved when done.
              </p>
            </div>
            <span
              className="text-sm font-bold tabular-nums shrink-0"
              style={{ color: RED }}
            >
              {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Done */}
      {uploadMode === "file" && uploadState === "done" && (
        <div
          className="mb-5 px-4 py-3 rounded-2xl text-sm font-medium"
          style={{
            background: "oklch(0.55 0.12 145 / 0.15)",
            border: "1px solid oklch(0.55 0.12 145 / 0.3)",
            color: "oklch(0.72 0.12 145)",
          }}
          data-ocid="upload.success_state"
        >
          Video uploaded and ready to watch!
        </div>
      )}

      {/* Error */}
      {uploadMode === "file" && uploadState === "error" && errorMsg && (
        <div
          className="mb-5 px-4 py-3 rounded-2xl text-sm"
          style={{
            background: "oklch(0.548 0.222 27 / 0.12)",
            border: "1px solid oklch(0.548 0.222 27 / 0.3)",
            color: "oklch(0.75 0.18 27)",
          }}
          data-ocid="upload.error_state"
        >
          <p className="font-semibold mb-1">Upload failed</p>
          <p>{errorMsg}</p>
          <button
            type="button"
            className="mt-2 text-xs underline"
            onClick={reset}
            style={{ color: "oklch(0.75 0.18 27)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      <div
        className="flex flex-col gap-5"
        style={{
          opacity: isInProgress || urlSubmitting ? 0.5 : 1,
          pointerEvents: isInProgress || urlSubmitting ? "none" : "auto",
        }}
      >
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: input is immediately below */}
          <label className="text-sm font-medium" style={LABEL_STYLE}>
            Title
          </label>
          <input
            id="upload-title"
            type="text"
            placeholder="Enter video title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 px-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
            style={INPUT_STYLE}
            data-ocid="upload.title_input"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: textarea is immediately below */}
          <label className="text-sm font-medium" style={LABEL_STYLE}>
            Description
          </label>
          <textarea
            id="upload-description"
            placeholder="Describe your video..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="px-4 py-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
            style={INPUT_STYLE}
            data-ocid="upload.description_textarea"
          />
        </div>

        {/* FILE MODE fields */}
        {uploadMode === "file" && (
          <>
            <div className="flex flex-col gap-1.5">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: file input referenced via ref */}
              <label className="text-sm font-medium" style={LABEL_STYLE}>
                Thumbnail
              </label>
              <button
                type="button"
                className="flex items-center gap-3 h-12 px-4 rounded-xl text-sm text-left active:scale-[0.98] transition-transform"
                style={{
                  ...INPUT_STYLE,
                  border: thumbnail
                    ? "1px solid oklch(0.548 0.222 27 / 0.6)"
                    : INPUT_STYLE.border,
                }}
                onClick={() => thumbRef.current?.click()}
                data-ocid="upload.thumbnail_button"
              >
                <ImageIcon
                  className="w-4 h-4 shrink-0"
                  style={{ color: thumbnail ? RED : "oklch(0.55 0.01 264)" }}
                />
                <span
                  style={{
                    color: thumbnail
                      ? "oklch(0.96 0.005 264)"
                      : "oklch(0.55 0.01 264)",
                  }}
                >
                  {thumbnail ? thumbnail.name : "Choose image..."}
                </span>
              </button>
              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                data-ocid="upload.thumbnail_input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: file input referenced via ref */}
              <label className="text-sm font-medium" style={LABEL_STYLE}>
                Video File
              </label>
              <button
                type="button"
                className="flex items-center gap-3 h-12 px-4 rounded-xl text-sm text-left active:scale-[0.98] transition-transform"
                style={{
                  ...INPUT_STYLE,
                  border: video
                    ? "1px solid oklch(0.548 0.222 27 / 0.6)"
                    : INPUT_STYLE.border,
                }}
                onClick={() => videoRef.current?.click()}
                data-ocid="upload.video_button"
              >
                <Film
                  className="w-4 h-4 shrink-0"
                  style={{ color: video ? RED : "oklch(0.55 0.01 264)" }}
                />
                <span
                  style={{
                    color: video
                      ? "oklch(0.96 0.005 264)"
                      : "oklch(0.55 0.01 264)",
                  }}
                >
                  {video ? video.name : "Choose video..."}
                </span>
              </button>
              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  console.log("Selected video file:", f);
                  setVideo(f);
                }}
                data-ocid="upload.video_input"
              />
              <p className="text-xs" style={{ color: MUTED }}>
                Up to 2GB. Playable instantly — permanent URL saved after
                upload.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: input is immediately below */}
              <label className="text-sm font-medium" style={LABEL_STYLE}>
                HLS Stream URL{" "}
                <span style={{ color: MUTED, fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                type="url"
                placeholder="https://cdn.example.com/videoId/master.m3u8"
                value={hlsUrl}
                onChange={(e) => setHlsUrl(e.target.value)}
                className="h-11 px-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
                style={INPUT_STYLE}
                data-ocid="upload.hls_url_input"
              />
            </div>
          </>
        )}

        {/* URL MODE fields */}
        {uploadMode === "url" && (
          <>
            <div className="flex flex-col gap-1.5">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: input is immediately below */}
              <label className="text-sm font-medium" style={LABEL_STYLE}>
                Video URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/video.mp4  or  .m3u8"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="h-11 px-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
                style={{
                  ...INPUT_STYLE,
                  border: videoUrl
                    ? "1px solid oklch(0.548 0.222 27 / 0.5)"
                    : INPUT_STYLE.border,
                }}
                data-ocid="upload.video_url_input"
              />
              <p className="text-xs" style={{ color: MUTED }}>
                Direct .mp4 or .m3u8 HLS stream URL. Auto-detects format.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: input is immediately below */}
              <label className="text-sm font-medium" style={LABEL_STYLE}>
                Thumbnail URL{" "}
                <span style={{ color: MUTED, fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                type="url"
                placeholder="https://example.com/thumbnail.jpg"
                value={thumbnailUrlInput}
                onChange={(e) => setThumbnailUrlInput(e.target.value)}
                className="h-11 px-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
                style={INPUT_STYLE}
                data-ocid="upload.thumbnail_url_input"
              />
            </div>
          </>
        )}

        {formError && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{
              background: "oklch(0.548 0.222 27 / 0.15)",
              color: "oklch(0.75 0.18 27)",
            }}
            data-ocid="upload.form_error_state"
          >
            {formError}
          </div>
        )}

        <button
          type="button"
          className="h-12 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2 mt-1 active:scale-95 transition-transform disabled:opacity-60"
          style={{
            background: RED,
            boxShadow:
              isInProgress || urlSubmitting
                ? "none"
                : "0 4px 16px rgba(225,29,46,0.4)",
          }}
          onClick={uploadMode === "file" ? handleFileSubmit : handleUrlSubmit}
          disabled={isInProgress || urlSubmitting}
          data-ocid="upload.submit_button"
        >
          {uploadMode === "file"
            ? "Upload Video"
            : urlSubmitting
              ? "Adding..."
              : "Add Video"}
        </button>
      </div>
    </div>
  );
}
