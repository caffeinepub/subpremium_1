import type { Video } from "@/data/videos";
import { Clock, Play } from "lucide-react";
import { useEffect, useState } from "react";

interface HistoryPageProps {
  onVideoSelect: (video: Video) => void;
  setRoute: (route: string) => void;
}

const TABS = ["All", "Videos", "Watched", "Liked"] as const;
type Tab = (typeof TABS)[number];

function formatProgress(seconds: number, duration: string): number {
  const parts = duration.split(":").map(Number);
  let total = 0;
  if (parts.length === 2) total = parts[0] * 60 + parts[1];
  else if (parts.length === 3)
    total = parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (!total) return 0;
  return Math.min(100, Math.round((seconds / total) * 100));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HistoryPage({
  onVideoSelect,
  setRoute,
}: HistoryPageProps) {
  const [allHistory, setAllHistory] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [myVideos, setMyVideos] = useState<any[]>([]);

  useEffect(() => {
    // Load current user's videos
    try {
      const user = JSON.parse(localStorage.getItem("authUser") || "null");
      if (user) {
        const videos = Object.keys(localStorage)
          .filter((k) => k.startsWith("video_"))
          .map((k) => {
            try {
              return JSON.parse(localStorage.getItem(k)!);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .filter((v: any) => v.ownerId === user.id)
          .slice(0, 5);
        setMyVideos(videos);
      }
    } catch {}

    // Load history
    const fromKeys: Video[] = Object.keys(localStorage)
      .filter((k) => k.startsWith("history_"))
      .map((k) => {
        try {
          return JSON.parse(localStorage.getItem(k) || "");
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    let legacy: Video[] = [];
    try {
      legacy = JSON.parse(localStorage.getItem("history") || "[]");
    } catch {}

    const seen = new Set<string>();
    const merged: Video[] = [];
    for (const v of [...fromKeys, ...legacy]) {
      if (v?.id && !seen.has(v.id)) {
        seen.add(v.id);
        merged.push(v);
      }
    }

    setAllHistory(merged);
  }, []);

  const filteredHistory = (() => {
    if (activeTab === "All" || activeTab === "Watched") return allHistory;
    if (activeTab === "Videos")
      return allHistory.filter((v) => !v.status || v.status === "READY");
    if (activeTab === "Liked") {
      return allHistory.filter(
        (v) => localStorage.getItem(`like_${v.id}`) === "true",
      );
    }
    return allHistory;
  })();

  const isEmpty = filteredHistory.length === 0;

  return (
    <div className="animate-page-in pb-4" data-ocid="history.section">
      {/* Your Videos section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 16px 8px",
        }}
      >
        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0 }}>
          Your videos
        </h3>
        <button
          type="button"
          data-ocid="history.dashboard.button"
          onClick={() => setRoute("dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "oklch(0.548 0.222 27)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          View all
        </button>
      </div>

      {/* Horizontal scroll row */}
      {myVideos.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            padding: "0 16px 16px",
            scrollbarWidth: "none",
          }}
          data-ocid="history.videos.list"
        >
          {myVideos.map((v: any, i: number) => (
            <button
              key={v.id}
              type="button"
              data-ocid={`history.videos.item.${i + 1}`}
              onClick={() => onVideoSelect(v as Video)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                width: 140,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 140,
                  aspectRatio: "16/9",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "oklch(0.18 0.005 264)",
                  marginBottom: 6,
                  position: "relative",
                }}
              >
                {v.thumbnailUrl ? (
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Play
                      style={{
                        color: "oklch(0.55 0.01 264)",
                        width: 24,
                        height: 24,
                      }}
                    />
                  </div>
                )}
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    background: v.isPrivate
                      ? "rgba(0,0,0,0.75)"
                      : "rgba(255,50,50,0.85)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {v.isPrivate ? "Private" : "Public"}
                </span>
              </div>
              <p
                style={{
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  margin: 0,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                }}
              >
                {v.title}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ color: "oklch(0.55 0.01 264)", fontSize: 13, margin: 0 }}>
            No videos uploaded yet
          </p>
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "oklch(0.22 0.006 264)",
          margin: "0 0 4px",
        }}
      />

      {/* Header */}
      <h1 className="text-lg font-bold text-white px-4 pt-4 pb-1">
        Watch History
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "12px 16px",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? "#fff" : "#222",
              color: activeTab === tab ? "#000" : "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: 16,
              fontWeight: activeTab === tab ? 700 : 400,
              fontSize: 14,
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 mt-16">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(0.22 0.006 264)" }}
          >
            <Clock
              className="w-10 h-10"
              style={{ color: "oklch(0.55 0.01 264)" }}
            />
          </div>
          <p className="text-white font-semibold text-base">
            {activeTab === "Liked"
              ? "No liked videos yet"
              : "No watch history yet"}
          </p>
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 264)" }}>
            {activeTab === "Liked"
              ? "Like a video to see it here"
              : "Videos you watch will appear here"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filteredHistory.map((video, i) => {
            const watchedSecs = Number.parseFloat(
              localStorage.getItem(`watch_${video.id}`) || "0",
            );
            const progressPct = video.duration
              ? formatProgress(watchedSecs, video.duration)
              : 0;

            return (
              <button
                key={video.id}
                type="button"
                className="w-full text-left active:opacity-80 transition-opacity"
                data-ocid={`history.item.${i + 1}`}
                onClick={() => onVideoSelect(video)}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 16px",
                  alignItems: "flex-start",
                  borderBottom: "1px solid oklch(0.22 0.006 264)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    position: "relative",
                    width: 160,
                    minWidth: 160,
                    aspectRatio: "16/9",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "oklch(0.18 0.005 264)",
                  }}
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Play
                        style={{
                          color: "oklch(0.55 0.01 264)",
                          width: 32,
                          height: 32,
                        }}
                      />
                    </div>
                  )}

                  {video.duration && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.85)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      {video.duration}
                    </span>
                  )}

                  {progressPct > 0 && progressPct < 100 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: "rgba(255,255,255,0.2)",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progressPct}%`,
                          background: "oklch(0.548 0.222 27)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 14,
                      lineHeight: 1.4,
                      marginBottom: 4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}
                  >
                    {video.title}
                  </p>
                  <p style={{ color: "oklch(0.55 0.01 264)", fontSize: 12 }}>
                    @{video.username || video.creator}
                  </p>
                  {watchedSecs > 0 && (
                    <p
                      style={{
                        color: "oklch(0.55 0.01 264)",
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      Watched {formatTime(watchedSecs)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
