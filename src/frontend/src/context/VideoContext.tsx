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

function parseLocalVideo(raw: Record<string, unknown>): Video | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    title: String(raw.title || "Untitled"),
    creator: String(raw.ownerName || ""),
    username: String(raw.ownerName || ""),
    ownerId: String(raw.ownerId || ""),
    views: Number(raw.views) || 0,
    description: String(raw.description || ""),
    date: raw.createdAt
      ? new Date(Number(raw.createdAt)).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "",
    thumbnailUrl: String(raw.thumbnailUrl || ""),
    // local videos store source in `url`; fall back to `videoUrl`
    videoUrl: String(raw.url || raw.videoUrl || ""),
    hlsUrl: raw.hlsUrl ? String(raw.hlsUrl) : undefined,
    duration: "",
    status: "READY",
    isLocalVideo: true,
    visibility: String(raw.visibility || "public"),
    createdAt: Number(raw.createdAt) || 0,
  };
}

/** Load videos saved directly to localStorage under video_* keys. */
function loadLocalVideos(): Video[] {
  try {
    const result: Video[] = [];
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith("video_")) continue;
      try {
        const raw = JSON.parse(localStorage.getItem(k) ?? "") as Record<
          string,
          unknown
        >;
        const v = parseLocalVideo(raw);
        if (v && (!v.visibility || v.visibility === "public")) {
          result.push(v);
        }
      } catch {
        // skip malformed entry
      }
    }
    return result.sort(
      (a, b) => ((b.createdAt as number) || 0) - ((a.createdAt as number) || 0),
    );
  } catch {
    return [];
  }
}

export function VideoProvider({ children }: { children: ReactNode }) {
  const { actor, isFetching } = useActor();
  const fetchedRef = useRef(false);

  const [videos, setVideos] = useState<Video[]>(() => {
    const localVideos = loadLocalVideos();
    try {
      const cached = localStorage.getItem("videosCache");
      if (cached) {
        const cachedVideos = JSON.parse(cached) as Video[];
        const seenIds = new Set<string>(localVideos.map((v) => v.id));
        for (const v of cachedVideos) {
          if (!seenIds.has(v.id)) {
            seenIds.add(v.id);
            localVideos.push(v);
          }
        }
      }
    } catch {
      // ignore
    }
    return localVideos;
  });
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    if (!actor) return;
    try {
      const [backendVideos, urlRecords] = await Promise.all([
        actor.getAllVideos(),
        actor.getAllVideoUrlRecords().catch(() => [] as VideoUrlRecord[]),
      ]);

      const blobMapped: Video[] = backendVideos.map(mapBackendVideo);
      const urlMapped: Video[] = urlRecords.map(mapUrlRecord);

      const seenIds = new Set<string>();
      const backendMerged: Video[] = [];
      for (const v of [...urlMapped, ...blobMapped]) {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          backendMerged.push(v);
        }
      }

      setVideos((prev) => {
        const tempVideos = prev.filter((v) => v.status === "uploading");
        const freshLocal = loadLocalVideos();
        const combined = [...tempVideos];
        const seenCombined = new Set<string>(combined.map((v) => v.id));

        for (const v of freshLocal) {
          if (!seenCombined.has(v.id)) {
            seenCombined.add(v.id);
            combined.push(v);
          }
        }
        for (const v of backendMerged) {
          if (!seenCombined.has(v.id)) {
            seenCombined.add(v.id);
            combined.push(v);
          }
        }

        localStorage.setItem("videosCache", JSON.stringify(backendMerged));
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
