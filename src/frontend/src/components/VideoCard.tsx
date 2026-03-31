import { type Video, formatViews } from "@/data/videos";
import { Loader2, Play } from "lucide-react";

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  compact?: boolean;
  "data-ocid"?: string;
}

const RED = "oklch(0.548 0.222 27)";

export default function VideoCard({
  video,
  onSelect,
  compact = false,
  "data-ocid": ocid,
}: VideoCardProps) {
  const isUploading = video.status === "uploading" || video.uploading === true;
  const pct = video.progress ?? 0;
  const isProcessing = pct >= 99;

  const overlayLabel = isProcessing ? "Processing..." : `Uploading ${pct}%`;

  return (
    <button
      type="button"
      className="w-full text-left active:scale-[0.98] transition-transform"
      onClick={() => !isUploading && onSelect(video)}
      data-ocid={ocid ?? "home.item.1"}
      disabled={isUploading}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full aspect-video overflow-hidden"
        style={{ background: "oklch(0.18 0.005 264)" }}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className={`w-full h-full object-cover ${
              isUploading ? "opacity-30" : ""
            }`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play
              className="w-12 h-12"
              style={{ color: "oklch(0.55 0.01 264)" }}
            />
          </div>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: RED }} />
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                background: "rgba(0,0,0,0.75)",
                color: isProcessing
                  ? "oklch(0.85 0.12 145)"
                  : "oklch(0.85 0.12 27)",
              }}
            >
              {overlayLabel}
            </span>
          </div>
        )}

        {/* Upload progress bar at bottom of thumbnail */}
        {isUploading && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${pct}%`,
                background: isProcessing ? "oklch(0.65 0.15 145)" : RED,
              }}
            />
          </div>
        )}

        {/* Duration badge */}
        {video.duration && !isUploading ? (
          <span
            className="absolute bottom-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.8)", color: "#fff" }}
          >
            {video.duration}
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className={compact ? "px-4 py-2" : "px-4 pt-3 pb-4"}>
        <p
          className={`font-semibold text-white leading-snug ${
            compact ? "text-sm line-clamp-2" : "text-base line-clamp-2"
          }`}
        >
          {video.title}
        </p>
        <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 264)" }}>
          @{video.username || video.creator} ·{" "}
          {isUploading ? overlayLabel : formatViews(video.views)}
        </p>
      </div>
    </button>
  );
}
