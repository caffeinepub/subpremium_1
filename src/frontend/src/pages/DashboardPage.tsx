import { ArrowLeft, Eye, Link, Lock, Play, Trash2 } from "lucide-react";
import { useState } from "react";

interface VideoRecord {
  id: string;
  title: string;
  thumbnailUrl?: string;
  visibility?: "public" | "private" | "unlisted";
  ownerId: string;
  [key: string]: unknown;
}

interface DashboardPageProps {
  onBack: () => void;
}

type Visibility = "public" | "private" | "unlisted";

const VISIBILITY_CYCLE: Visibility[] = ["public", "private", "unlisted"];

const VISIBILITY_CONFIG: Record<
  Visibility,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  public: {
    label: "Public",
    icon: <Eye size={11} />,
    color: "#fff",
    bg: "oklch(0.548 0.222 27)",
  },
  private: {
    label: "Private",
    icon: <Lock size={11} />,
    color: "oklch(0.7 0.01 264)",
    bg: "oklch(0.28 0.008 264)",
  },
  unlisted: {
    label: "Unlisted",
    icon: <Link size={11} />,
    color: "#000",
    bg: "oklch(0.88 0.16 95)",
  },
};

function loadUserVideos(): VideoRecord[] {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return [];
    const user = JSON.parse(raw);
    return Object.keys(localStorage)
      .filter((k) => k.startsWith("video_"))
      .map((k) => {
        try {
          return JSON.parse(localStorage.getItem(k) || "");
        } catch {
          return null;
        }
      })
      .filter((v): v is VideoRecord => v !== null && v.ownerId === user.id);
  } catch {
    return [];
  }
}

export default function DashboardPage({ onBack }: DashboardPageProps) {
  const [videos, setVideos] = useState<VideoRecord[]>(loadUserVideos);

  function updateTitle(id: string, newTitle: string) {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const updated = { ...v, title: newTitle };
        localStorage.setItem(`video_${id}`, JSON.stringify(updated));
        return updated;
      }),
    );
  }

  function cycleVisibility(id: string) {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const current: Visibility = (v.visibility as Visibility) || "public";
        const idx = VISIBILITY_CYCLE.indexOf(current);
        const next = VISIBILITY_CYCLE[(idx + 1) % VISIBILITY_CYCLE.length];
        const updated = { ...v, visibility: next };
        localStorage.setItem(`video_${id}`, JSON.stringify(updated));
        return updated;
      }),
    );
  }

  function deleteVideo(id: string) {
    localStorage.removeItem(`video_${id}`);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div
      className="min-h-full"
      style={{ background: "oklch(0.148 0.004 264)", color: "#fff" }}
      data-ocid="dashboard.page"
    >
      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          padding: 16px;
        }
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .dashboard-grid > * {
          width: 100%;
        }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
        style={{
          background: "oklch(0.148 0.004 264)",
          borderBottom: "1px solid oklch(0.22 0.006 264)",
        }}
      >
        <button
          type="button"
          className="flex items-center justify-center w-9 h-9 rounded-full transition-colors active:opacity-70"
          style={{ background: "oklch(0.22 0.006 264)" }}
          onClick={onBack}
          data-ocid="dashboard.back_button"
        >
          <ArrowLeft size={18} />
        </button>
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ color: "#fff" }}
        >
          Your Videos
        </h1>
        <span
          className="ml-auto text-sm font-medium px-2.5 py-0.5 rounded-full"
          style={{
            background: "oklch(0.22 0.006 264)",
            color: "oklch(0.65 0.01 264)",
          }}
        >
          {videos.length}
        </span>
      </div>

      {/* Content */}
      <div>
        {videos.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4"
            data-ocid="dashboard.empty_state"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.22 0.006 264)" }}
            >
              <Play size={28} style={{ color: "oklch(0.548 0.222 27)" }} />
            </div>
            <p
              className="text-base font-medium"
              style={{ color: "oklch(0.55 0.01 264)" }}
            >
              No videos yet
            </p>
            <p
              className="text-sm text-center px-8"
              style={{ color: "oklch(0.42 0.006 264)" }}
            >
              Upload a video to see it here
            </p>
          </div>
        ) : (
          <div className="dashboard-grid" data-ocid="dashboard.list">
            {videos.map((v, i) => {
              const vis: Visibility = (v.visibility as Visibility) || "public";
              const cfg = VISIBILITY_CONFIG[vis];
              return (
                <div
                  key={v.id}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: "oklch(0.22 0.006 264)" }}
                  data-ocid={`dashboard.item.${i + 1}`}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-full flex items-center justify-center"
                    style={{
                      aspectRatio: "16/9",
                      background: "oklch(0.18 0.006 264)",
                    }}
                  >
                    {v.thumbnailUrl ? (
                      <img
                        src={v.thumbnailUrl as string}
                        alt={v.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Play
                        size={24}
                        style={{ color: "oklch(0.38 0.006 264)" }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2 flex flex-col gap-2">
                    {/* Title input */}
                    <input
                      type="text"
                      value={v.title}
                      onChange={(e) => updateTitle(v.id, e.target.value)}
                      className="w-full text-xs font-medium rounded-lg px-2 py-1.5 outline-none transition-all"
                      style={{
                        background: "oklch(0.18 0.006 264)",
                        color: "#fff",
                        border: "1px solid transparent",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "oklch(0.548 0.222 27)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                      data-ocid={`dashboard.input.${i + 1}`}
                    />

                    {/* Actions row */}
                    <div className="flex items-center justify-between gap-1">
                      {/* Visibility badge */}
                      <button
                        type="button"
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-opacity active:opacity-70"
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                        }}
                        onClick={() => cycleVisibility(v.id)}
                        data-ocid={`dashboard.toggle.${i + 1}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        className="flex items-center justify-center w-7 h-7 rounded-full transition-colors active:opacity-70"
                        style={{ background: "oklch(0.26 0.01 264)" }}
                        onClick={() => deleteVideo(v.id)}
                        data-ocid={`dashboard.delete_button.${i + 1}`}
                      >
                        <Trash2
                          size={13}
                          style={{ color: "oklch(0.548 0.222 27)" }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
