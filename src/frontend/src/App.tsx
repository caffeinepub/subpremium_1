import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { VideoProvider, useVideos } from "@/context/VideoContext";
import type { Video } from "@/data/videos";
import { UploadEngineProvider } from "@/hooks/useUploadEngine";
import DashboardPage from "@/pages/DashboardPage";
import HistoryPage from "@/pages/HistoryPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import MenuPage from "@/pages/MenuPage";
import ProfilePage from "@/pages/ProfilePage";
import RecoverPage from "@/pages/RecoverPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SettingsPage from "@/pages/SettingsPage";
import UploadPage from "@/pages/UploadPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import WatchPage from "@/pages/WatchPage";
import { useEffect, useRef, useState } from "react";

export type Route =
  | "home"
  | "upload"
  | "history"
  | "menu"
  | "settings"
  | "profile"
  | "login"
  | "watch"
  | "dashboard"
  | "recover";

interface Notification {
  id: string;
  type: "like" | "comment";
  videoId: string;
  videoTitle: string;
  message: string;
  timestamp: number;
  read: boolean;
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

function getNotifications(): Notification[] {
  try {
    return JSON.parse(localStorage.getItem("notifications") || "[]");
  } catch {
    return [];
  }
}

function requestFirstTimePermissions() {
  const firstVisit = !localStorage.getItem("visited");
  if (!firstVisit) return;
  localStorage.setItem("visited", "true");

  if ("Notification" in window) {
    Notification.requestPermission().catch(() => {});
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
    );
  }
}

function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-welcome-fade"
      style={{ background: "rgba(0,0,0,0.93)" }}
      onAnimationEnd={onDone}
      data-ocid="welcome.overlay"
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-white font-bold text-4xl mb-8"
        style={{
          background: "oklch(0.548 0.222 27)",
          boxShadow:
            "0 0 0 1px oklch(0.548 0.222 27 / 0.3), 0 12px 48px oklch(0.548 0.222 27 / 0.55)",
        }}
      >
        S
      </div>
      <h1
        className="text-3xl font-bold text-white text-center tracking-widest uppercase mb-3"
        style={{ letterSpacing: "0.14em" }}
      >
        Welcome to SUB PREMIUM
      </h1>
      <p
        className="text-sm text-center px-10 leading-relaxed"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        Watch more content and discover thousands of videos
      </p>
    </div>
  );
}

// ── Data Reset (runs once at module load, before any React renders) ──────────
function applyDataReset() {
  const RESET_VERSION = "reset_v2";
  if (localStorage.getItem("_dataReset") === RESET_VERSION) return;

  const keep = new Set([
    "authUser",
    "visited",
    "notifSettings",
    "privacySettings",
    "videoQuality",
    "autoplay",
    "darkMode",
    "_dataReset",
  ]);

  const toDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !keep.has(key)) {
      toDelete.push(key);
    }
  }
  for (const k of toDelete) {
    localStorage.removeItem(k);
  }

  localStorage.setItem("_dataReset", RESET_VERSION);
}

applyDataReset();

function AppContent() {
  const { authUser, login } = useAuth();
  const [showRecover, setShowRecover] = useState(false);
  const [urlVerifyToken] = useState(
    () => new URLSearchParams(window.location.search).get("verify") || "",
  );
  const [urlResetToken] = useState(
    () => new URLSearchParams(window.location.search).get("reset") || "",
  );
  const [route, setRoute] = useState<Route>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [watchVideo, setWatchVideo] = useState<Video | null>(null);
  const { videos, refreshVideos } = useVideos();
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(() => {
    try {
      const list = getNotifications();
      return list.filter((n) => !n.read).length;
    } catch {
      return 0;
    }
  });
  const [notifList, setNotifList] = useState<Notification[]>(() =>
    getNotifications(),
  );
  const panelRef = useRef<HTMLDivElement>(null);

  function refreshNotifCount() {
    const list = getNotifications();
    setNotifList(list);
    setNotifCount(list.filter((n) => !n.read).length);
  }

  function handleBellClick() {
    setNotifOpen((v) => !v);
    if (!notifOpen) {
      const list = getNotifications();
      setNotifList(list);
      setNotifCount(list.filter((n) => !n.read).length);
    }
  }

  function markAllRead() {
    const list = getNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem("notifications", JSON.stringify(list));
    setNotifList(list);
    setNotifCount(0);
  }

  function markItemRead(id: string) {
    const list = getNotifications().map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    localStorage.setItem("notifications", JSON.stringify(list));
    setNotifList(list);
    setNotifCount(list.filter((n) => !n.read).length);
  }

  useEffect(() => {
    if (!notifOpen) return;
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  useEffect(() => {
    const handler = () => refreshVideos();
    window.addEventListener("refreshVideos", handler);
    return () => window.removeEventListener("refreshVideos", handler);
  }, [refreshVideos]);

  useEffect(() => {
    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, []);

  // Handle URL-based token flows (accessible from any auth state)
  if (urlVerifyToken) {
    return (
      <VerifyEmailPage
        token={urlVerifyToken}
        onDone={() => {
          window.history.replaceState({}, "", window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  if (urlResetToken) {
    return (
      <ResetPasswordPage
        token={urlResetToken}
        onDone={() => {
          window.history.replaceState({}, "", window.location.pathname);
          window.location.reload();
        }}
        onSuccess={(user) => {
          login(user);
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  }

  if (!authUser) {
    if (showRecover) {
      return (
        <RecoverPage
          onBack={() => setShowRecover(false)}
          onSuccess={(user) => {
            login(user);
            setShowRecover(false);
          }}
        />
      );
    }
    return (
      <LoginPage
        onSuccess={() => {
          setRoute("home");
          requestFirstTimePermissions();
          welcomeTimerRef.current = setTimeout(() => {
            setShowWelcome(true);
          }, 3000);
        }}
        onForgotPassword={() => setShowRecover(true)}
      />
    );
  }

  function handleVideoSelect(video: Video) {
    setWatchVideo(video);
    setRoute("watch");
    setNotifOpen(false);
  }

  const isWatch = route === "watch";

  const RED = "oklch(0.548 0.222 27)";
  const MUTED = "oklch(0.55 0.01 264)";
  const CARD_BG = "oklch(0.22 0.006 264)";
  const BG = "oklch(0.178 0.005 264)";

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "oklch(0.148 0.004 264)" }}
    >
      <TopNav
        authUser={authUser}
        onAvatarClick={() => setRoute("profile")}
        notificationCount={notifCount}
        onBellClick={handleBellClick}
      />

      {notifOpen && (
        <div
          ref={panelRef}
          className="fixed z-[60] rounded-2xl overflow-hidden shadow-2xl"
          style={{
            top: 58,
            right: 12,
            width: 320,
            maxHeight: 440,
            background: BG,
            border: "1px solid oklch(0.28 0.006 264)",
            display: "flex",
            flexDirection: "column",
          }}
          data-ocid="notifications.panel"
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid oklch(0.24 0.006 264)" }}
          >
            <span className="text-sm font-semibold text-white">
              Notifications
            </span>
            {notifList.some((n) => !n.read) && (
              <button
                type="button"
                className="text-xs font-medium active:opacity-70 transition-opacity"
                style={{ color: RED }}
                onClick={markAllRead}
                data-ocid="notifications.mark_all_button"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifList.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 gap-2"
                data-ocid="notifications.empty_state"
              >
                <span className="text-2xl">🔔</span>
                <p className="text-sm" style={{ color: MUTED }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              notifList.map((n, i) => (
                <button
                  key={n.id}
                  type="button"
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
                  style={{
                    background: n.read
                      ? "transparent"
                      : "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid oklch(0.22 0.006 264)",
                  }}
                  onClick={() => markItemRead(n.id)}
                  data-ocid={`notifications.item.${i + 1}`}
                >
                  <span
                    className="text-base shrink-0 mt-0.5"
                    style={{ lineHeight: 1 }}
                  >
                    {n.type === "like" ? "👍" : "💬"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-snug"
                      style={{
                        color: n.read ? MUTED : "#fff",
                        fontWeight: n.read ? 400 : 500,
                      }}
                    >
                      {n.message}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "oklch(0.42 0.006 264)" }}
                    >
                      {relativeTime(n.timestamp)}
                    </p>
                  </div>
                  {!n.read && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: RED }}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: "56px", paddingBottom: "64px" }}
        data-ocid="main.section"
      >
        {route === "home" && (
          <div key="home" className="h-full">
            <HomePage
              onUpload={() => setRoute("upload")}
              onVideoSelect={handleVideoSelect}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}
        {route === "watch" && watchVideo && (
          <div key="watch">
            <WatchPage
              video={watchVideo}
              allVideos={videos}
              onVideoSelect={handleVideoSelect}
              onBack={() => setRoute("home")}
              onNotification={refreshNotifCount}
            />
          </div>
        )}
        {route === "upload" && (
          <div key="upload" className="px-4">
            <UploadPage onNavigate={(r) => setRoute(r as Route)} />
          </div>
        )}
        {route === "history" && (
          <div key="history" className="h-full">
            <HistoryPage
              onVideoSelect={handleVideoSelect}
              setRoute={(r) => setRoute(r as Route)}
            />
          </div>
        )}
        {route === "menu" && (
          <div key="menu" className="px-4">
            <MenuPage />
          </div>
        )}
        {route === "settings" && (
          <div key="settings" className="px-4">
            <SettingsPage
              onNavigateProfile={() => setRoute("profile")}
              onLogout={() => setRoute("login")}
            />
          </div>
        )}
        {route === "profile" && (
          <div key="profile" className="px-4">
            <ProfilePage
              onBack={() => setRoute("home")}
              onVideoSelect={(v) => {
                setWatchVideo(v);
                setRoute("watch");
              }}
            />
          </div>
        )}
        {route === "dashboard" && (
          <div key="dashboard">
            <DashboardPage onBack={() => setRoute("history")} />
          </div>
        )}
      </main>
      <BottomNav
        route={isWatch ? "home" : route}
        onNavigate={(r) => {
          setRoute(r);
        }}
      />
      <Toaster />

      {showWelcome && <WelcomeOverlay onDone={() => setShowWelcome(false)} />}

      <span style={{ display: "none", color: CARD_BG }} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <VideoProvider>
        <UploadEngineProvider>
          <AppContent />
        </UploadEngineProvider>
      </VideoProvider>
    </AuthProvider>
  );
}
