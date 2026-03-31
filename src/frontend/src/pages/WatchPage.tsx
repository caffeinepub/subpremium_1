import VideoCard from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useVideos } from "@/context/VideoContext";
import { type Video, formatViews } from "@/data/videos";
import { useActor } from "@/hooks/useActor";
import { tombstoneSession } from "@/utils/uploadIDB";
import Hls from "hls.js";
import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Download,
  Edit2,
  Loader2,
  MoreHorizontal,
  Play,
  Send,
  Settings,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
}

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

function getLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setLS(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function pushNotification(
  type: "like" | "comment",
  videoId: string,
  videoTitle: string,
) {
  const list = (() => {
    try {
      return JSON.parse(localStorage.getItem("notifications") || "[]");
    } catch {
      return [];
    }
  })();
  list.unshift({
    id: Date.now().toString(),
    type,
    videoId,
    videoTitle,
    message:
      type === "like"
        ? `You liked "${videoTitle}"`
        : `You commented on "${videoTitle}"`,
    timestamp: Date.now(),
    read: false,
  });
  localStorage.setItem("notifications", JSON.stringify(list.slice(0, 50)));
}

interface HlsLevel {
  index: number;
  label: string;
}

interface WatchPageProps {
  video: Video;
  allVideos: Video[];
  onVideoSelect: (v: Video) => void;
  onBack: () => void;
  onNotification?: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
const STATIC_QUALITY_OPTIONS = ["Auto", "1080p", "720p"];

export default function WatchPage({
  video: initialVideo,
  allVideos,
  onVideoSelect,
  onBack,
  onNotification,
}: WatchPageProps) {
  const { authUser } = useAuth();
  const { updateVideo, removeVideo } = useVideos();
  const { actor } = useActor();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Use local video state so edits and suggestion clicks reflect immediately
  const [video, setVideo] = useState<Video>(initialVideo);

  // HLS quality levels from manifest
  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);

  // Quality display badge
  const [quality, setQuality] = useState<string>(
    () => localStorage.getItem("videoQuality") || "Auto",
  );
  const [qualitySwitching, setQualitySwitching] = useState(false);

  // In-player settings menu
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Mute state (starts muted for autoplay compliance)
  const [muted, setMuted] = useState(true);

  // Play/pause state
  const [isPlaying, setIsPlaying] = useState(false);

  // Autoplay preference
  const [autoplay, setAutoplay] = useState<boolean>(
    () => localStorage.getItem("autoplay") !== "false",
  );

  // Playback speed
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() =>
    Number.parseFloat(localStorage.getItem("playbackSpeed") || "1"),
  );

  // Like / Dislike
  const [liked, setLiked] = useState(() =>
    getLS<boolean>(`like_${video.id}`, false),
  );
  const [disliked, setDisliked] = useState(() =>
    getLS<boolean>(`dislike_${video.id}`, false),
  );

  // Subscribe
  const [subscribed, setSubscribed] = useState(() =>
    getLS<boolean>(`sub_${video.username}`, false),
  );

  // Description
  const [descExpanded, setDescExpanded] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>(() =>
    getLS<Comment[]>(`comments_${video.id}`, []),
  );
  const [commentText, setCommentText] = useState("");

  // Playlist modal
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>(() =>
    getLS<Playlist[]>("playlists", []),
  );
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // More menu
  const [moreOpen, setMoreOpen] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(video.title);
  const [editDesc, setEditDesc] = useState(video.description);
  const [editSaving, setEditSaving] = useState(false);

  // Auto-hide controls (YouTube-style)
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner =
    authUser &&
    (authUser.id === video.ownerId ||
      authUser.username === video.username ||
      authUser.username === video.creator);

  // Reset hide timer — clears existing timer and starts a new 5s countdown
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  }, []);

  // Show controls on load and start auto-hide timer
  // biome-ignore lint/correctness/useExhaustiveDependencies: video.id triggers reset when video changes
  useEffect(() => {
    setShowControls(true);
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [video.id, resetHideTimer]);

  // ── HLS / Video source setup ──
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Prefer hlsUrl for HLS streaming; fall back to videoUrl for plain mp4
    const streamUrl = video.hlsUrl || video.videoUrl || "";
    if (!streamUrl) return;

    const isHls = streamUrl.endsWith(".m3u8") || !!video.hlsUrl;

    // Destroy any previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setHlsLevels([]);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(el);

      hls.currentLevel = -1;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels: HlsLevel[] = hls.levels.map((l, i) => ({
          index: i,
          label: l.height ? `${l.height}p` : `Level ${i + 1}`,
        }));
        setHlsLevels(levels);

        const saved = localStorage.getItem("videoQuality");
        if (saved && saved !== "Auto") {
          const match = hls.levels.findIndex((l) => `${l.height}p` === saved);
          if (match >= 0) {
            hls.currentLevel = match;
          }
        }

        const raw = localStorage.getItem(`watch_${video.id}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const t = typeof parsed === "object" ? parsed.currentTime : parsed;
            if (t > 0) el.currentTime = t;
          } catch {
            const t = Number.parseFloat(raw);
            if (t > 0) el.currentTime = t;
          }
        }

        el.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHING, () => {
        setQualitySwitching(true);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const l = hls.levels[data.level];
        setQuality(l?.height ? `${l.height}p` : "Auto");
        setQualitySwitching(false);
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (isHls && el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = streamUrl;
      el.load();

      const onMeta = () => {
        const raw = localStorage.getItem(`watch_${video.id}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const t = typeof parsed === "object" ? parsed.currentTime : parsed;
            if (t > 0) el.currentTime = t;
          } catch {
            const t = Number.parseFloat(raw);
            if (t > 0) el.currentTime = t;
          }
        }
        el.play().catch(() => {});
      };
      el.addEventListener("loadedmetadata", onMeta, { once: true });
      return () => {
        el.removeEventListener("loadedmetadata", onMeta);
        el.src = "";
      };
    }

    // Plain mp4 path
    el.src = streamUrl;
    el.load();

    const onMeta = () => {
      const raw = localStorage.getItem(`watch_${video.id}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const t = typeof parsed === "object" ? parsed.currentTime : parsed;
          if (t > 0) el.currentTime = t;
        } catch {
          const t = Number.parseFloat(raw);
          if (t > 0) el.currentTime = t;
        }
      }
      el.play().catch(() => {});
    };
    el.addEventListener("loadedmetadata", onMeta, { once: true });
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.src = "";
    };
  }, [video.hlsUrl, video.videoUrl, video.id]);

  // Sync muted state when native controls change volume/mute
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const syncMute = () => setMuted(el.muted);
    el.addEventListener("volumechange", syncMute);
    return () => el.removeEventListener("volumechange", syncMute);
  }, []);

  // Sync isPlaying state with native video play/pause events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  // Apply playback speed when video element is ready or speed changes
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Save watch history to localStorage
  useEffect(() => {
    const history: Video[] = JSON.parse(
      localStorage.getItem("history") || "[]",
    );
    const exists = history.find((v) => v.id === video.id);
    if (!exists) {
      const updated = [video, ...history].slice(0, 50);
      localStorage.setItem("history", JSON.stringify(updated));
    }
  }, [video]);

  // Save video progress
  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const pct = (el.currentTime / el.duration) * 100;
    localStorage.setItem(
      `watch_${video.id}`,
      JSON.stringify({
        currentTime: el.currentTime,
        duration: el.duration,
        pct,
      }),
    );
  }, [video.id]);

  // Smart suggestions: same creator → similar titles → most viewed
  const suggestions = (() => {
    const others = allVideos.filter((v) => v.id !== video.id);
    const currentCreator = video.ownerId || video.username || video.creator;
    const titleWords = new Set(
      (video.title || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    return others.sort((a, b) => {
      const aCreator =
        (a.ownerId || a.username || a.creator) === currentCreator ? 1 : 0;
      const bCreator =
        (b.ownerId || b.username || b.creator) === currentCreator ? 1 : 0;
      if (aCreator !== bCreator) return bCreator - aCreator;
      const aWords = (a.title || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => titleWords.has(w)).length;
      const bWords = (b.title || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => titleWords.has(w)).length;
      if (aWords !== bWords) return bWords - aWords;
      return (b.views || 0) - (a.views || 0);
    });
  })();

  // ── Suggestion click: swap video in-place, no page reload ──
  const handleSuggestionClick = useCallback(
    (nextVideo: Video) => {
      // Update local state — triggers HLS/source useEffect
      setVideo(nextVideo);
      // Reset per-video UI state
      setLiked(getLS<boolean>(`like_${nextVideo.id}`, false));
      setDisliked(getLS<boolean>(`dislike_${nextVideo.id}`, false));
      setComments(getLS<Comment[]>(`comments_${nextVideo.id}`, []));
      setDescExpanded(false);
      setSettingsOpen(false);
      setMoreOpen(false);

      // Directly wire video element for instant response (non-HLS fallback)
      const el = videoRef.current;
      if (el && !nextVideo.hlsUrl) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        const src = nextVideo.videoUrl || "";
        if (src) {
          el.src = src;
          el.load();
          const raw = localStorage.getItem(`watch_${nextVideo.id}`);
          const resume = () => {
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                const t =
                  typeof parsed === "object"
                    ? parsed.currentTime
                    : Number(parsed);
                if (t > 0) el.currentTime = t;
              } catch {
                const t = Number.parseFloat(raw);
                if (t > 0) el.currentTime = t;
              }
            }
            el.play().catch(() => {});
          };
          el.addEventListener("loadedmetadata", resume, { once: true });
        }
      }

      // Also notify parent to update route/state (no page reload)
      onVideoSelect(nextVideo);
    },
    [onVideoSelect],
  );

  // Auto-play next on video end
  const handleEnded = useCallback(() => {
    const currentCreator = video.ownerId || video.username || video.creator;
    const titleWords = new Set(
      (video.title || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const sorted = allVideos
      .filter((v) => v.id !== video.id)
      .sort((a, b) => {
        const aC =
          (a.ownerId || a.username || a.creator) === currentCreator ? 1 : 0;
        const bC =
          (b.ownerId || b.username || b.creator) === currentCreator ? 1 : 0;
        if (aC !== bC) return bC - aC;
        const aW = (a.title || "")
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => titleWords.has(w)).length;
        const bW = (b.title || "")
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => titleWords.has(w)).length;
        if (aW !== bW) return bW - aW;
        return (b.views || 0) - (a.views || 0);
      });
    const next = sorted[0];
    if (next && autoplay) handleSuggestionClick(next);
  }, [
    allVideos,
    video.id,
    video.title,
    video.ownerId,
    video.username,
    video.creator,
    autoplay,
    handleSuggestionClick,
  ]);

  // Mute toggle
  function handleMuteToggle() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  // Play/pause toggle
  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }

  // Like / dislike
  function handleLike() {
    const next = !liked;
    setLiked(next);
    localStorage.setItem(`like_${video.id}`, JSON.stringify(next));
    if (next) {
      if (disliked) {
        setDisliked(false);
        localStorage.setItem(`dislike_${video.id}`, JSON.stringify(false));
      }
      pushNotification("like", video.id, video.title);
      onNotification?.();
    }
  }

  function handleDislike() {
    const next = !disliked;
    setDisliked(next);
    localStorage.setItem(`dislike_${video.id}`, JSON.stringify(next));
    if (next && liked) {
      setLiked(false);
      localStorage.setItem(`like_${video.id}`, JSON.stringify(false));
    }
  }

  // Subscribe
  function handleSubscribe() {
    const next = !subscribed;
    setSubscribed(next);
    setLS(`sub_${video.username}`, next);
  }

  // Share
  async function handleShare() {
    const url = video.hlsUrl || video.videoUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Video link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  }

  // HLS quality selection
  function handleQualitySelect(selectedLabel: string) {
    localStorage.setItem("videoQuality", selectedLabel);
    setQuality(selectedLabel);

    const hls = hlsRef.current;
    if (!hls) return;

    if (selectedLabel === "Auto") {
      hls.currentLevel = -1;
    } else {
      const match = hlsLevels.find((l) => l.label === selectedLabel);
      if (match !== undefined) {
        setQualitySwitching(true);
        hls.currentLevel = match.index;
      }
    }
  }

  // Autoplay toggle
  function handleAutoplayToggle(val: boolean) {
    setAutoplay(val);
    localStorage.setItem("autoplay", String(val));
  }

  // Playback speed
  function handleSpeedSelect(speed: number) {
    setPlaybackSpeed(speed);
    localStorage.setItem("playbackSpeed", String(speed));
    const el = videoRef.current;
    if (el) el.playbackRate = speed;
  }

  // Close settings menu on outside tap
  useEffect(() => {
    if (!settingsOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [settingsOpen]);

  // Delete video
  async function handleDelete() {
    setMoreOpen(false);
    removeVideo(video.id);
    await tombstoneSession(video.id);
    toast.success("Video deleted");
    onBack();
    try {
      if (actor && (actor as unknown as Record<string, unknown>).deleteVideo) {
        await (
          actor as unknown as { deleteVideo: (id: string) => Promise<void> }
        ).deleteVideo(video.id);
      }
    } catch {
      // backend sync optional
    }
  }

  // Edit video
  async function handleEditSave() {
    setEditSaving(true);
    const updates: Partial<Video> = {
      title: editTitle.trim() || video.title,
      description: editDesc.trim(),
    };
    const updated = { ...video, ...updates };
    setVideo(updated);
    updateVideo(video.id, updates);
    setEditOpen(false);
    setEditSaving(false);
    toast.success("Video updated!");
    try {
      if (
        actor &&
        (actor as unknown as Record<string, unknown>).updateVideoMeta
      ) {
        await (
          actor as unknown as {
            updateVideoMeta: (
              id: string,
              title: string,
              desc: string,
            ) => Promise<void>;
          }
        ).updateVideoMeta(
          video.id,
          updates.title ?? video.title,
          updates.description ?? video.description,
        );
      }
    } catch {
      // backend sync optional
    }
  }

  // Comment
  function submitComment() {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      author: authUser?.username || "anonymous",
      timestamp: Date.now(),
    };
    const updated = [newComment, ...comments];
    setComments(updated);
    setLS(`comments_${video.id}`, updated);
    setCommentText("");
    pushNotification("comment", video.id, video.title);
    onNotification?.();
  }

  // Playlist
  function toggleVideoInPlaylist(playlistId: string) {
    const updated = playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      const has = pl.videoIds.includes(video.id);
      return {
        ...pl,
        videoIds: has
          ? pl.videoIds.filter((id) => id !== video.id)
          : [...pl.videoIds, video.id],
      };
    });
    setPlaylists(updated);
    setLS("playlists", updated);
  }

  function createPlaylist() {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      videoIds: [video.id],
    };
    const updated = [...playlists, newPl];
    setPlaylists(updated);
    setLS("playlists", updated);
    setNewPlaylistName("");
    toast.success(`Playlist "${newPl.name}" created!`);
  }

  const creatorName =
    video.creator || video.username || authUser?.name || "Creator";
  const creatorUsername =
    video.username || video.creator || authUser?.username || "creator";
  const initials = creatorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const RED = "oklch(0.548 0.222 27)";
  const MUTED = "oklch(0.55 0.01 264)";

  const qualityOptions: string[] =
    hlsLevels.length > 0
      ? ["Auto", ...hlsLevels.map((l) => l.label)]
      : STATIC_QUALITY_OPTIONS;

  const hasSource = !!(video.hlsUrl || video.videoUrl);

  return (
    <div className="animate-page-in" data-ocid="watch.section">
      {/* ── Video Player ── */}
      <div
        className="w-full aspect-video bg-black relative cursor-pointer"
        data-ocid="watch.canvas_target"
        onClick={() => {
          togglePlay();
          setShowControls(true);
          resetHideTimer();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            togglePlay();
            setShowControls(true);
            resetHideTimer();
          }
        }}
      >
        {hasSource ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            style={{ position: "relative", zIndex: 1 }}
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.22 0.006 264)" }}
            >
              <Play className="w-8 h-8 ml-1" style={{ color: RED }} />
            </div>
            <p className="text-xs" style={{ color: MUTED }}>
              No video source
            </p>
          </div>
        )}

        {/* Controls overlay — all controls fade in/out together */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            opacity: showControls ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: "none",
          }}
        >
          {/* Back Button (top-left) */}
          <button
            type="button"
            className="absolute flex items-center justify-center w-9 h-9 rounded-full transition-opacity active:scale-95"
            style={{
              top: 12,
              left: 12,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.12)",
              pointerEvents: "auto",
              touchAction: "manipulation",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            aria-label="Go back"
            data-ocid="watch.back_button"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          {/* Mute / Unmute Button (top-right) */}
          <button
            type="button"
            className="absolute flex items-center justify-center w-9 h-9 rounded-full active:scale-95 transition-transform"
            style={{
              top: 12,
              right: 12,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.12)",
              pointerEvents: "auto",
              touchAction: "manipulation",
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleMuteToggle();
              resetHideTimer();
            }}
            aria-label={muted ? "Unmute" : "Mute"}
            data-ocid="watch.mute_button"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Settings Gear (top-center) */}
          <div
            ref={settingsMenuRef}
            className="absolute"
            style={{
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          >
            {/* Gear button */}
            <button
              type="button"
              className="flex items-center justify-center w-9 h-9 rounded-full active:scale-95 transition-transform"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.12)",
                pointerEvents: "auto",
                touchAction: "manipulation",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSettingsOpen((v) => !v);
                resetHideTimer();
              }}
              aria-label="Video settings"
              data-ocid="watch.settings_button"
            >
              {qualitySwitching ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Settings className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Settings dropdown */}
            <div
              className="absolute mt-2 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(12,12,16,0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.10)",
                minWidth: 200,
                left: "50%",
                transform: "translateX(-50%)",
                transition: "opacity 0.18s ease, transform 0.18s ease",
                opacity: settingsOpen ? 1 : 0,
                transformOrigin: "top center",
                pointerEvents: settingsOpen ? "auto" : "none",
                zIndex: 11,
              }}
              data-ocid="watch.settings_menu"
            >
              {/* Quality Section */}
              <div
                className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
                style={{ color: MUTED }}
              >
                Quality
              </div>
              <div
                className="flex flex-col pb-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                {qualityOptions.map((q) => {
                  const isActive =
                    quality === q || (q === "Auto" && quality === "Auto");
                  return (
                    <button
                      key={q}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors"
                      style={{
                        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                        background: isActive
                          ? "rgba(255,255,255,0.07)"
                          : "transparent",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQualitySelect(q);
                      }}
                      data-ocid={`watch.quality_option_${q}`}
                    >
                      <span className="font-medium">{q}</span>
                      {isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: RED, flexShrink: 0 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Autoplay Section */}
              <div
                className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
                style={{ color: MUTED }}
              >
                Autoplay
              </div>
              <div
                className="flex pb-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                {([true, false] as const).map((val) => {
                  const label = val ? "On" : "Off";
                  const isActive = autoplay === val;
                  return (
                    <button
                      key={label}
                      type="button"
                      className="flex-1 py-2 text-sm font-medium transition-colors"
                      style={{
                        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                        background: isActive
                          ? "rgba(255,255,255,0.07)"
                          : "transparent",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoplayToggle(val);
                      }}
                      data-ocid={`watch.autoplay_option_${label}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Speed Section */}
              <div
                className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
                style={{ color: MUTED }}
              >
                Speed
              </div>
              <div className="flex pb-3">
                {SPEED_OPTIONS.map((s) => {
                  const isActive = playbackSpeed === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className="flex-1 py-2 text-sm font-medium transition-colors"
                      style={{
                        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                        background: isActive
                          ? "rgba(255,255,255,0.07)"
                          : "transparent",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeedSelect(s);
                      }}
                      data-ocid={`watch.speed_option_${s}`}
                    >
                      {s === 1 ? "1x" : `${s}x`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Play/Pause */}
          <button
            type="button"
            className="absolute flex items-center justify-center w-14 h-14 rounded-full active:scale-95 transition-transform"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.15)",
              pointerEvents: "auto",
              touchAction: "manipulation",
            }}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
              resetHideTimer();
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
            data-ocid="watch.play_pause_button"
          >
            {isPlaying ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden="true"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden="true"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Seek Back 10s */}
          <button
            type="button"
            className="absolute flex items-center justify-center w-11 h-11 rounded-full active:scale-95 transition-transform"
            style={{
              bottom: 56,
              left: "calc(50% - 80px)",
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.12)",
              pointerEvents: "auto",
              touchAction: "manipulation",
            }}
            onClick={(e) => {
              e.stopPropagation();
              const el = videoRef.current;
              if (el) el.currentTime = Math.max(0, el.currentTime - 10);
              resetHideTimer();
            }}
            aria-label="Seek back 10 seconds"
            data-ocid="watch.seek_back_button"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.99" />
              <text
                x="8"
                y="15"
                fontSize="7"
                fill="white"
                stroke="none"
                fontWeight="bold"
              >
                10
              </text>
            </svg>
          </button>

          {/* Seek Forward 10s */}
          <button
            type="button"
            className="absolute flex items-center justify-center w-11 h-11 rounded-full active:scale-95 transition-transform"
            style={{
              bottom: 56,
              left: "calc(50% + 36px)",
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.12)",
              pointerEvents: "auto",
              touchAction: "manipulation",
            }}
            onClick={(e) => {
              e.stopPropagation();
              const el = videoRef.current;
              if (el)
                el.currentTime = Math.min(
                  el.duration || Number.POSITIVE_INFINITY,
                  el.currentTime + 10,
                );
              resetHideTimer();
            }}
            aria-label="Seek forward 10 seconds"
            data-ocid="watch.seek_forward_button"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-.49-4.99" />
              <text
                x="8"
                y="15"
                fontSize="7"
                fill="white"
                stroke="none"
                fontWeight="bold"
              >
                10
              </text>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Video Info ── */}
      <div className="px-4 pt-3">
        <h1 className="text-lg font-bold text-white leading-tight">
          {video.title}
        </h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          {formatViews(video.views)} · {video.date}
        </p>
      </div>

      {/* ── Channel Row ── */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
          style={{ background: RED }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight truncate">
            {creatorName}
          </p>
          <p className="text-xs" style={{ color: MUTED }}>
            @{creatorUsername}
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 rounded-full text-xs font-semibold px-4"
          style={
            subscribed
              ? {
                  background: "transparent",
                  border: `1px solid ${MUTED}`,
                  color: MUTED,
                }
              : { background: RED, border: "none", color: "#fff" }
          }
          onClick={handleSubscribe}
          data-ocid="watch.subscribe_button"
        >
          {subscribed ? "Subscribed" : "Subscribe"}
        </Button>
      </div>

      {/* ── Actions Row ── */}
      <div
        className="px-4 py-2 flex gap-1 overflow-x-auto scrollbar-hide"
        style={{
          borderTop: "1px solid oklch(0.22 0.006 264)",
          borderBottom: "1px solid oklch(0.22 0.006 264)",
        }}
      >
        {(
          [
            {
              key: "like",
              Icon: ThumbsUp,
              label: "Like",
              active: liked,
              onClick: handleLike,
            },
            {
              key: "dislike",
              Icon: ThumbsDown,
              label: "Dislike",
              active: disliked,
              onClick: handleDislike,
            },
            {
              key: "share",
              Icon: Share2,
              label: "Share",
              active: false,
              onClick: handleShare,
            },
            {
              key: "save",
              Icon: Bookmark,
              label: "Save",
              active: false,
              onClick: () => setPlaylistOpen(true),
            },
            {
              key: "download",
              Icon: Download,
              label: "Download",
              active: false,
              onClick: () => toast("Download coming soon"),
            },
            {
              key: "more",
              Icon: MoreHorizontal,
              label: "More",
              active: moreOpen,
              onClick: () => setMoreOpen((v) => !v),
            },
          ] as const
        ).map(({ key, Icon, label, active, onClick }) => (
          <button
            key={key}
            type="button"
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl active:scale-95 transition-transform shrink-0"
            style={{ background: "oklch(0.22 0.006 264)" }}
            onClick={onClick as () => void}
            data-ocid={`watch.${key}_button`}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: active ? RED : "oklch(0.80 0.005 264)" }}
              fill={active ? RED : "none"}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: active ? RED : MUTED }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── More Menu ── */}
      {moreOpen && (
        <div
          className="mx-4 mt-2 rounded-2xl overflow-hidden"
          style={{
            background: "oklch(0.22 0.006 264)",
            border: "1px solid oklch(0.28 0.006 264)",
          }}
          data-ocid="watch.more_menu"
        >
          {isOwner ? (
            <>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white active:bg-white/5 transition-colors"
                onClick={() => {
                  setMoreOpen(false);
                  setEditTitle(video.title);
                  setEditDesc(video.description);
                  setEditOpen(true);
                }}
                data-ocid="watch.edit_button"
              >
                <Edit2 className="w-4 h-4" style={{ color: MUTED }} />
                Edit video
              </button>
              <div style={{ borderTop: "1px solid oklch(0.28 0.006 264)" }} />
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-sm active:bg-white/5 transition-colors"
                style={{ color: "oklch(0.75 0.18 27)" }}
                onClick={handleDelete}
                data-ocid="watch.delete_button"
              >
                <Trash2 className="w-4 h-4" />
                Delete video
              </button>
            </>
          ) : (
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white active:bg-white/5"
              onClick={() => setMoreOpen(false)}
            >
              <X className="w-4 h-4" style={{ color: MUTED }} />
              Close
            </button>
          )}
        </div>
      )}

      {/* ── Description ── */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid oklch(0.22 0.006 264)" }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: MUTED }}>
          Description
        </p>
        <div
          className={`text-sm text-white leading-relaxed ${
            descExpanded ? "whitespace-pre-line" : "line-clamp-2"
          }`}
        >
          {video.description}
        </div>
        {!descExpanded && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold mt-2"
            style={{ color: RED }}
            onClick={() => setDescExpanded(true)}
            data-ocid="watch.description_toggle"
          >
            Show more <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
        {descExpanded && (
          <>
            <p className="text-xs mt-3" style={{ color: MUTED }}>
              {creatorName} · {video.date}
            </p>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-semibold mt-2"
              style={{ color: RED }}
              onClick={() => setDescExpanded(false)}
              data-ocid="watch.description_collapse"
            >
              Show less <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Comments ── */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid oklch(0.22 0.006 264)" }}
      >
        <p className="text-sm font-semibold text-white mb-3">Comments</p>

        <div className="flex gap-2 mb-4">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-full text-sm h-9"
            style={{
              background: "oklch(0.22 0.006 264)",
              border: "1px solid oklch(0.28 0.006 264)",
              color: "#fff",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitComment();
            }}
            data-ocid="watch.comment_input"
          />
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            style={{ background: RED }}
            onClick={submitComment}
            data-ocid="watch.comment_submit_button"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        {comments.length === 0 && (
          <p
            className="text-xs text-center py-4"
            style={{ color: MUTED }}
            data-ocid="watch.comments_empty_state"
          >
            No comments yet. Be the first!
          </p>
        )}
        <div className="flex flex-col gap-3">
          {comments.map((c, i) => (
            <div
              key={c.id}
              className="flex gap-2"
              data-ocid={`watch.comment.item.${i + 1}`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                style={{ background: RED }}
              >
                {c.author.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: RED }}
                  >
                    @{c.author}
                  </span>
                  <span className="text-xs" style={{ color: MUTED }}>
                    {relativeTime(c.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-white mt-0.5 leading-snug break-words">
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Up Next ── */}
      <div className="px-4 py-3 pb-6">
        <p className="text-sm font-semibold text-white mb-3">Up Next</p>
        <div className="flex flex-col">
          {suggestions.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onSelect={handleSuggestionClick}
              compact
            />
          ))}
        </div>
      </div>

      {/* ── Playlist Modal ── */}
      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent
          className="rounded-2xl max-w-sm mx-4"
          style={{
            background: "oklch(0.178 0.005 264)",
            border: "1px solid oklch(0.28 0.006 264)",
          }}
          data-ocid="watch.playlist_dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">Save to Playlist</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {playlists.length === 0 && (
              <p className="text-sm py-2" style={{ color: MUTED }}>
                No playlists yet. Create one below.
              </p>
            )}
            {playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                className="flex items-center gap-3 cursor-pointer py-1 w-full text-left"
                onClick={() => toggleVideoInPlaylist(pl.id)}
                data-ocid="watch.playlist_item"
              >
                <Checkbox
                  checked={pl.videoIds.includes(video.id)}
                  onCheckedChange={() => toggleVideoInPlaylist(pl.id)}
                  data-ocid="watch.playlist_checkbox"
                />
                <span className="text-sm text-white">{pl.name}</span>
              </button>
            ))}
          </div>

          <div
            className="flex gap-2 pt-2"
            style={{ borderTop: "1px solid oklch(0.24 0.006 264)" }}
          >
            <Input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="New playlist name"
              className="flex-1 text-sm"
              style={{
                background: "oklch(0.22 0.006 264)",
                border: "1px solid oklch(0.28 0.006 264)",
                color: "#fff",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") createPlaylist();
              }}
              data-ocid="watch.new_playlist_input"
            />
            <Button
              size="sm"
              style={{ background: RED, color: "#fff" }}
              onClick={createPlaylist}
              data-ocid="watch.create_playlist_button"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="rounded-2xl max-w-sm mx-4"
          style={{
            background: "oklch(0.178 0.005 264)",
            border: "1px solid oklch(0.28 0.006 264)",
          }}
          data-ocid="watch.edit_dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">Edit Video</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: input is immediately below */}
              <label className="text-xs font-medium" style={{ color: MUTED }}>
                Title
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm"
                style={{
                  background: "oklch(0.22 0.006 264)",
                  border: "1px solid oklch(0.28 0.006 264)",
                  color: "#fff",
                }}
                data-ocid="watch.edit_title_input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: input is immediately below */}
              <label className="text-xs font-medium" style={{ color: MUTED }}>
                Description
              </label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                className="px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{
                  background: "oklch(0.22 0.006 264)",
                  border: "1px solid oklch(0.28 0.006 264)",
                  color: "#fff",
                }}
                data-ocid="watch.edit_description_input"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 text-white font-semibold"
                style={{ background: RED }}
                onClick={handleEditSave}
                disabled={editSaving}
                data-ocid="watch.edit_save_button"
              >
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
