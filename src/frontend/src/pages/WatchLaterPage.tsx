import VideoCard from "@/components/VideoCard";
import type { Video } from "@/data/videos";
import { Bookmark, Trash2 } from "lucide-react";
import { useState } from "react";

interface WatchLaterPageProps {
  onVideoSelect: (video: Video) => void;
}

const RED = "oklch(0.548 0.222 27)";
const MUTED = "oklch(0.55 0.01 264)";

export default function WatchLaterPage({ onVideoSelect }: WatchLaterPageProps) {
  const [list, setList] = useState<Video[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("watchLater") || "[]");
    } catch {
      return [];
    }
  });

  function removeVideo(id: string) {
    const updated = list.filter((v) => v.id !== id);
    setList(updated);
    localStorage.setItem("watchLater", JSON.stringify(updated));
  }

  function clearAll() {
    setList([]);
    localStorage.removeItem("watchLater");
  }

  return (
    <div className="animate-page-in px-4 py-4" data-ocid="watchlater.section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5" style={{ color: RED }} />
          <h1 className="text-lg font-bold text-white">Watch Later</h1>
          <span className="text-sm" style={{ color: MUTED }}>
            ({list.length})
          </span>
        </div>
        {list.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium active:opacity-70"
            style={{ color: MUTED }}
            data-ocid="watchlater.clear_button"
          >
            Clear all
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          data-ocid="watchlater.empty_state"
        >
          <Bookmark className="w-12 h-12" style={{ color: MUTED }} />
          <p className="text-sm" style={{ color: MUTED }}>
            No saved videos yet
          </p>
          <p
            className="text-xs text-center px-8"
            style={{ color: "oklch(0.42 0.006 264)" }}
          >
            Tap Save on any video to add it here
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
          data-ocid="watchlater.list"
        >
          {list.map((v, i) => (
            <div
              key={v.id}
              style={{ position: "relative" }}
              data-ocid={`watchlater.item.${i + 1}`}
            >
              <VideoCard video={v} onSelect={onVideoSelect} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeVideo(v.id);
                }}
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  background: "rgba(0,0,0,0.7)",
                  border: "none",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 20,
                }}
                aria-label="Remove from Watch Later"
                data-ocid={`watchlater.delete_button.${i + 1}`}
              >
                <Trash2 size={13} style={{ color: "rgba(255,80,80,0.9)" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
