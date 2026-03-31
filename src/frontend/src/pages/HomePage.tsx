import VideoCard from "@/components/VideoCard";
import type { Video } from "@/data/videos";
import { useVideos } from "@/hooks/useVideos";
import { Film, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HomePageProps {
  onUpload: () => void;
  onVideoSelect: (video: Video) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
}

const RAINBOW_CSS = `
.rainbow-search-bar {
  position: relative;
  border-radius: 20px;
  background: #111;
  overflow: hidden;
}
.rainbow-search-bar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet, red);
  background-size: 200% 100%;
  animation: moveLine 4s linear infinite;
  filter: none;
  box-shadow: none;
  z-index: 3;
}
.rainbow-search-bar::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet, red);
  background-size: 200% 100%;
  animation: moveLine 4s linear infinite reverse;
  filter: none;
  box-shadow: none;
  z-index: 3;
}
@keyframes moveLine {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
`;

interface WatchProgress {
  currentTime: number;
  duration: number;
  pct: number;
}

function ContinueWatchingRow({
  videos,
  onVideoSelect,
}: {
  videos: Video[];
  onVideoSelect: (v: Video) => void;
}) {
  const [inProgress, setInProgress] = useState<
    Array<{ video: Video; pct: number }>
  >([]);

  useEffect(() => {
    const result: Array<{ video: Video; pct: number }> = [];
    for (const video of videos) {
      const raw = localStorage.getItem(`watch_${video.id}`);
      if (!raw) continue;
      try {
        const parsed: WatchProgress | number = JSON.parse(raw);
        const pct =
          typeof parsed === "object" ? parsed.pct : parsed > 0 ? 50 : 0;
        if (pct >= 5 && pct <= 97) {
          result.push({ video, pct });
        }
      } catch {
        // skip malformed entries
      }
    }
    setInProgress(result);
  }, [videos]);

  if (inProgress.length === 0) return null;

  const RED = "oklch(0.548 0.222 27)";
  const MUTED = "oklch(0.55 0.01 264)";

  return (
    <div className="px-4 pt-4" data-ocid="home.continue_watching_section">
      <p className="text-sm font-semibold text-white mb-3">Continue Watching</p>
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {inProgress.map(({ video, pct }, i) => (
          <button
            key={video.id}
            type="button"
            className="shrink-0 active:scale-95 transition-transform text-left"
            style={{ width: 160 }}
            onClick={() => onVideoSelect(video)}
            data-ocid={`home.continue.item.${i + 1}`}
          >
            <div
              className="relative rounded-xl overflow-hidden"
              style={{ aspectRatio: "16/9", background: "#111" }}
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "oklch(0.22 0.006 264)" }}
                >
                  <span style={{ color: MUTED, fontSize: 10 }}>
                    No thumbnail
                  </span>
                </div>
              )}
              {/* Progress bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: RED }}
                />
              </div>
            </div>
            <p className="text-xs text-white mt-1.5 leading-tight truncate font-medium">
              {video.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({
  onUpload,
  onVideoSelect,
  searchQuery,
  onSearchChange,
}: HomePageProps) {
  const { videos, loading } = useVideos();
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const didRestore = useRef(false);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  // Restore last search from localStorage on mount (once)
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    const saved = localStorage.getItem("lastSearch");
    if (saved) {
      onSearchChangeRef.current(saved);
      setDebouncedQuery(saved);
    }
  }, []);

  // Debounce: wait 300ms after typing stops before updating filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery) {
        localStorage.setItem("lastSearch", searchQuery);
      } else {
        localStorage.removeItem("lastSearch");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const q = debouncedQuery.toLowerCase();
  const filteredVideos = debouncedQuery
    ? videos.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.creator?.toLowerCase().includes(q) ||
          v.username?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q),
      )
    : videos;

  const searchBar = (
    <>
      <style>{RAINBOW_CSS}</style>
      <div className="mx-4 my-4" style={{ position: "relative", zIndex: 1 }}>
        <div className="rainbow-search-bar">
          <div
            style={{
              position: "relative",
              zIndex: 4,
              display: "flex",
              alignItems: "center",
              padding: "12px",
            }}
          >
            <Search
              className="w-5 h-5 shrink-0 mr-3"
              style={{ color: "oklch(0.55 0.01 264)" }}
            />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "#fff",
                outline: "none",
                fontSize: "15px",
              }}
              data-ocid="home.search_input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                style={{
                  position: "relative",
                  zIndex: 2,
                  background: "none",
                  border: "none",
                  color: "oklch(0.55 0.01 264)",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: 1,
                  padding: "0 4px",
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (loading && videos.length === 0) {
    return (
      <div className="animate-page-in" data-ocid="home.loading_state">
        <ContinueWatchingRow videos={videos} onVideoSelect={onVideoSelect} />
        {searchBar}
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2
            className="w-10 h-10 animate-spin"
            style={{ color: "oklch(0.548 0.222 27)" }}
          />
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="animate-page-in" data-ocid="home.section">
        <ContinueWatchingRow videos={videos} onVideoSelect={onVideoSelect} />
        {searchBar}
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2"
            style={{ background: "oklch(0.22 0.006 264)" }}
          >
            <Film
              className="w-10 h-10"
              style={{ color: "oklch(0.55 0.01 264)" }}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-center">
            No videos yet
          </h1>
          <p
            className="text-sm text-center max-w-[220px]"
            style={{ color: "oklch(0.55 0.01 264)" }}
          >
            Upload your first video to get started
          </p>
          <button
            type="button"
            className="mt-2 px-7 py-3 rounded-full font-semibold text-sm text-white active:scale-95 transition-transform"
            style={{
              background: "oklch(0.548 0.222 27)",
              boxShadow: "0 4px 14px rgba(225,29,46,0.4)",
            }}
            onClick={onUpload}
            data-ocid="home.upload_button"
          >
            Upload Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page-in" data-ocid="home.section">
      <ContinueWatchingRow videos={videos} onVideoSelect={onVideoSelect} />
      {searchBar}
      <div
        className="divide-y"
        style={{ borderColor: "oklch(0.22 0.006 264)" }}
      >
        {filteredVideos.map((video, i) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={onVideoSelect}
            data-ocid={`home.item.${i + 1}`}
          />
        ))}
        {filteredVideos.length === 0 && debouncedQuery && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="home.empty_state"
          >
            <Search
              className="w-10 h-10"
              style={{ color: "oklch(0.4 0.006 264)" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "oklch(0.7 0.01 264)" }}
            >
              No videos found
            </p>
            <p className="text-xs" style={{ color: "oklch(0.45 0.006 264)" }}>
              Try a different title, creator, or keyword
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
