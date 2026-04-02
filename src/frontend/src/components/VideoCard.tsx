import { type Video, formatViews } from "@/data/videos";
import { Loader2, MoreVertical, Play } from "lucide-react";
import { useState } from "react";

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  compact?: boolean;
  "data-ocid"?: string;
}

const RED = "oklch(0.548 0.222 27)";

function getDisplayName(video: Video): string {
  try {
    const cu = JSON.parse(localStorage.getItem("authUser") || "null");
    if (cu && (video as any).ownerId === cu.id) {
      return (
        cu.username ||
        (video as any).ownerName ||
        video.username ||
        video.creator ||
        ""
      );
    }
  } catch {}
  return (video as any).ownerName || video.username || video.creator || "";
}

export default function VideoCard({
  video,
  onSelect,
  compact = false,
  "data-ocid": ocid,
}: VideoCardProps) {
  const isUploading = video.status === "uploading" || video.uploading === true;
  const pct = video.progress ?? 0;
  const isProcessing = pct >= 99;
  const [menuOpen, setMenuOpen] = useState(false);

  const overlayLabel = isProcessing ? "Processing..." : `Uploading ${pct}%`;
  const displayName = getDisplayName(video);

  return (
    <div
      className="w-full"
      style={{ position: "relative" }}
      data-ocid={ocid ?? "home.item.1"}
    >
      {/* 3-dot menu button */}
      {!isUploading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            background: "rgba(0,0,0,0.6)",
            border: "none",
            borderRadius: "50%",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
          }}
          aria-label="More options"
        >
          <MoreVertical size={15} />
        </button>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          {/* backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9,
            }}
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
            role="presentation"
          />
          <div
            style={{
              position: "absolute",
              top: 36,
              right: 8,
              zIndex: 20,
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 8,
              minWidth: 130,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            {["Watch later", "Share", "Not interested"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Card button */}
      <button
        type="button"
        className="w-full text-left active:scale-[0.98] transition-transform"
        onClick={() => !isUploading && onSelect(video)}
        disabled={isUploading}
        style={{ display: "block" }}
      >
        {/* Thumbnail */}
        <div
          className="relative w-full aspect-video overflow-hidden"
          style={{ background: "oklch(0.18 0.005 264)", borderRadius: 8 }}
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
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: RED }}
              />
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

          {/* Upload progress bar */}
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
        <div className={compact ? "px-1 py-1" : "px-1 pt-2 pb-1"}>
          {/* Title — 1 line, ellipsis */}
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              margin: 0,
            }}
          >
            {video.title}
          </p>
          {/* Username */}
          <p
            style={{
              fontSize: 12,
              color: "#aaa",
              margin: "2px 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName ? `@${displayName}` : null}
            {!isUploading && video.views != null
              ? `${displayName ? " · " : ""}${formatViews(video.views)}`
              : null}
            {isUploading ? overlayLabel : null}
          </p>
        </div>
      </button>
    </div>
  );
}
