import type { Video as BackendVideo, VideoUrlRecord } from "@/backend";
import type { Video } from "@/data/videos";
import { useActor } from "@/hooks/useActor";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface VideoContextValue {
  videos: Video[];
  loading: boolean;
  addVideo: (video: Video) => void;
  updateVideo: (id: string, updates: Partial<Video>) => void;
  removeVideo: (id: string) => void;
  refreshVideos: () => void;
}

const VideoContext = createContext<VideoContextValue | null>(null);

function mapBackendVideo(v: BackendVideo): Video {
  return {
    id: v.id,
    title: v.title,
    creator: v.ownerName || v.owner.toText().slice(0, 12),
    username: v.ownerName || v.owner.toText().slice(0, 12),
    ownerId: v.owner.toText(),
    views: 0,
    description: v.description,
    date: new Date(Number(v.createdAt / 1_000_000n)).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    ),
    thumbnailUrl: v.thumbnail.getDirectURL(),
    videoUrl: v.video.getDirectURL(),
    hlsUrl: v.hlsUrl ?? undefined,
    duration: "",
    status: "READY",
  };
}

function mapUrlRecord(v: VideoUrlRecord): Video {
  return {
    id: v.id,
    title: v.title,
    creator: v.ownerName || v.owner.toText().slice(0, 12),
    username: v.ownerName || v.owner.toText().slice(0, 12),
    ownerId: v.owner.toText(),
    views: 0,
    description: v.description,
    date: new Date(Number(v.createdAt / 1_000_000n)).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    ),
    thumbnailUrl: v.thumbnailUrl || "",
    videoUrl: v.videoUrl || "",
    hlsUrl: v.hlsUrl ?? undefined,
    duration: "",
    status: "READY",
  };
}

export function VideoProvider({ children }: { children: ReactNode }) {
  const { actor, isFetching } = useActor();
  const fetchedRef = useRef(false);

  const [videos, setVideos] = useState<Video[]>(() => {
    try {
      const cached = localStorage.getItem("videosCache");
      if (cached) return JSON.parse(cached) as Video[];
    } catch {
      // ignore
    }
    return [];
  });
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    if (!actor) return;
    try {
      // Fetch both blob videos and URL-only videos in parallel
      const [backendVideos, urlRecords] = await Promise.all([
        actor.getAllVideos(),
        actor.getAllVideoUrlRecords().catch(() => [] as VideoUrlRecord[]),
      ]);

      const blobMapped: Video[] = backendVideos.map(mapBackendVideo);
      const urlMapped: Video[] = urlRecords.map(mapUrlRecord);

      // Merge: URL records first (newer format), then blob videos
      // Deduplicate by id in case a video appears in both lists
      const seenIds = new Set<string>();
      const merged: Video[] = [];
      for (const v of [...urlMapped, ...blobMapped]) {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          merged.push(v);
        }
      }

      setVideos((prev) => {
        const tempVideos = prev.filter((v) => v.status === "uploading");
        const combined = [...tempVideos, ...merged];
        // Cache only READY videos
        localStorage.setItem("videosCache", JSON.stringify(merged));
        return combined;
      });
    } catch {
      // keep cached
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor || isFetching || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchVideos();
  }, [actor, isFetching, fetchVideos]);

  useEffect(() => {
    if (!isFetching && !actor) {
      setLoading(false);
    }
  }, [actor, isFetching]);

  const addVideo = useCallback((video: Video) => {
    setVideos((prev) => [video, ...prev]);
  }, []);

  const updateVideo = useCallback((id: string, updates: Partial<Video>) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    );
  }, []);

  const removeVideo = useCallback((id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const refreshVideos = useCallback(() => {
    fetchedRef.current = false;
    fetchVideos();
  }, [fetchVideos]);

  const readyOrUploading = videos.filter(
    (v) => !v.status || v.status === "READY" || v.status === "uploading",
  );

  return (
    <VideoContext.Provider
      value={{
        videos: readyOrUploading,
        loading,
        addVideo,
        updateVideo,
        removeVideo,
        refreshVideos,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideos() {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideos must be used within VideoProvider");
  return ctx;
}
