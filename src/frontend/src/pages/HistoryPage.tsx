import VideoCard from "@/components/VideoCard";
import type { Video } from "@/data/videos";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface HistoryPageProps {
  onVideoSelect: (video: Video) => void;
}

export default function HistoryPage({ onVideoSelect }: HistoryPageProps) {
  const [history, setHistory] = useState<Video[]>([]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("history") || "[]",
    ) as Video[];
    setHistory(saved);
  }, []);

  if (history.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4 animate-page-in"
        data-ocid="history.section"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2"
          style={{ background: "oklch(0.22 0.006 264)" }}
        >
          <Clock
            className="w-10 h-10"
            style={{ color: "oklch(0.55 0.01 264)" }}
          />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Watch History</h1>
        <p className="text-sm" style={{ color: "oklch(0.55 0.01 264)" }}>
          No watch history yet
        </p>
      </div>
    );
  }

  return (
    <div className="animate-page-in" data-ocid="history.section">
      <h1 className="text-lg font-bold text-white px-4 pt-4 pb-2">
        Watch History
      </h1>
      <div
        className="divide-y"
        style={{ borderColor: "oklch(0.22 0.006 264)" }}
      >
        {history.map((video, i) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={onVideoSelect}
            data-ocid={`history.item.${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
