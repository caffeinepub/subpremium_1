import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import {
  ChevronRight,
  EyeOff,
  HardDrive,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Play,
  Settings,
  ThumbsUp,
  UserCircle,
  Video,
} from "lucide-react";
import { useState } from "react";

interface SettingsPageProps {
  onNavigateProfile: () => void;
  onLogout: () => void;
}

function loadNotifSettings() {
  try {
    const raw = localStorage.getItem("notifSettings");
    if (raw) return JSON.parse(raw) as { likes: boolean; comments: boolean };
  } catch {}
  return { likes: true, comments: true };
}

function loadPrivacySettings() {
  try {
    const raw = localStorage.getItem("privacySettings");
    if (raw)
      return JSON.parse(raw) as { privateAccount: boolean; hideLiked: boolean };
  } catch {}
  return { privateAccount: false, hideLiked: false };
}

export default function SettingsPage({
  onNavigateProfile,
  onLogout,
}: SettingsPageProps) {
  const { logout } = useAuth();

  // Preferences
  const [videoQuality, setVideoQuality] = useState<string>(
    () => localStorage.getItem("videoQuality") || "Auto",
  );
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    const v = localStorage.getItem("autoplay");
    return v === null ? true : v === "true";
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const v = localStorage.getItem("darkMode");
    return v === null ? true : v === "true";
  });

  // Notifications
  const [notifSettings, setNotifSettings] = useState(loadNotifSettings);

  // Privacy
  const [privacySettings, setPrivacySettings] = useState(loadPrivacySettings);

  // Data & Storage
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    logout();
    onLogout();
  };

  const handleQualityChange = (q: string) => {
    setVideoQuality(q);
    localStorage.setItem("videoQuality", q);
  };

  const handleAutoplayChange = (val: boolean) => {
    setAutoplay(val);
    localStorage.setItem("autoplay", String(val));
  };

  const handleDarkModeChange = (val: boolean) => {
    setDarkMode(val);
    localStorage.setItem("darkMode", String(val));
  };

  const handleNotifChange = (key: "likes" | "comments", val: boolean) => {
    const next = { ...notifSettings, [key]: val };
    setNotifSettings(next);
    localStorage.setItem("notifSettings", JSON.stringify(next));
  };

  const handlePrivacyChange = (
    key: "privateAccount" | "hideLiked",
    val: boolean,
  ) => {
    const next = { ...privacySettings, [key]: val };
    setPrivacySettings(next);
    localStorage.setItem("privacySettings", JSON.stringify(next));
  };

  const handleClearCache = () => {
    const authUser = localStorage.getItem("authUser");
    const users = localStorage.getItem("users");
    const tokens = localStorage.getItem("tokens");
    localStorage.clear();
    if (authUser) localStorage.setItem("authUser", authUser);
    if (users) localStorage.setItem("users", users);
    if (tokens) localStorage.setItem("tokens", tokens);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const cardStyle = {
    background: "oklch(0.178 0.005 264)",
    border: "1px solid oklch(0.24 0.006 264)",
  };
  const dividerStyle = { borderTop: "1px solid oklch(0.24 0.006 264)" };
  const mutedColor = "oklch(0.45 0.008 264)";
  const redAccent = "oklch(0.548 0.222 27)";
  const rowBase = "flex items-center justify-between h-14 px-4";

  const sectionHeader = (title: string) => (
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
      style={{ color: mutedColor }}
    >
      {title}
    </p>
  );

  return (
    <div
      className="animate-page-in pt-4 pb-8 px-4 flex flex-col gap-6"
      data-ocid="settings.page"
    >
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Settings className="w-5 h-5" style={{ color: redAccent }} />
        Settings
      </h1>

      {/* Account */}
      <section data-ocid="settings.panel">
        {sectionHeader("Account")}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <button
            type="button"
            className={`${rowBase} w-full active:scale-[0.98] transition-transform`}
            onClick={onNavigateProfile}
            data-ocid="settings.edit_button"
          >
            <div className="flex items-center gap-3">
              <UserCircle className="w-5 h-5" style={{ color: redAccent }} />
              <span className="text-sm font-medium text-foreground">
                Edit Profile
              </span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: mutedColor }} />
          </button>
        </div>
      </section>

      {/* Preferences */}
      <section data-ocid="settings.section">
        {sectionHeader("Preferences")}
        <div
          className="rounded-2xl overflow-hidden flex flex-col"
          style={cardStyle}
        >
          {/* Video Quality */}
          <div className={`${rowBase} gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <Video
                className="w-5 h-5 shrink-0"
                style={{ color: mutedColor }}
              />
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                Video Quality
              </span>
            </div>
            <div className="flex gap-1" data-ocid="settings.toggle">
              {["Auto", "1080p", "720p"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQualityChange(q)}
                  data-ocid="settings.tab"
                  style={{
                    background:
                      videoQuality === q
                        ? "oklch(0.548 0.222 27)"
                        : "oklch(0.24 0.006 264)",
                    color: videoQuality === q ? "#fff" : "oklch(0.65 0.01 264)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-4" style={dividerStyle} />

          {/* Autoplay */}
          <div className={rowBase}>
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5" style={{ color: mutedColor }} />
              <Label
                htmlFor="toggle-autoplay"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Autoplay
              </Label>
            </div>
            <Switch
              id="toggle-autoplay"
              checked={autoplay}
              onCheckedChange={handleAutoplayChange}
              data-ocid="settings.switch"
            />
          </div>

          <div className="mx-4" style={dividerStyle} />

          {/* Dark Mode */}
          <div className={rowBase}>
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5" style={{ color: mutedColor }} />
              <Label
                htmlFor="toggle-darkmode"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Dark Mode
              </Label>
            </div>
            <Switch
              id="toggle-darkmode"
              checked={darkMode}
              onCheckedChange={handleDarkModeChange}
              data-ocid="settings.switch"
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section data-ocid="settings.section">
        {sectionHeader("Notifications")}
        <div
          className="rounded-2xl overflow-hidden flex flex-col"
          style={cardStyle}
        >
          {/* Likes */}
          <div className={rowBase}>
            <div className="flex items-center gap-3">
              <ThumbsUp className="w-5 h-5" style={{ color: mutedColor }} />
              <Label
                htmlFor="toggle-notif-likes"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Likes
              </Label>
            </div>
            <Switch
              id="toggle-notif-likes"
              checked={notifSettings.likes}
              onCheckedChange={(val) => handleNotifChange("likes", val)}
              data-ocid="settings.switch"
            />
          </div>

          <div className="mx-4" style={dividerStyle} />

          {/* Comments */}
          <div className={rowBase}>
            <div className="flex items-center gap-3">
              <MessageCircle
                className="w-5 h-5"
                style={{ color: mutedColor }}
              />
              <Label
                htmlFor="toggle-notif-comments"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Comments
              </Label>
            </div>
            <Switch
              id="toggle-notif-comments"
              checked={notifSettings.comments}
              onCheckedChange={(val) => handleNotifChange("comments", val)}
              data-ocid="settings.switch"
            />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section data-ocid="settings.section">
        {sectionHeader("Privacy")}
        <div
          className="rounded-2xl overflow-hidden flex flex-col"
          style={cardStyle}
        >
          {/* Private Account */}
          <div className={rowBase}>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5" style={{ color: mutedColor }} />
              <Label
                htmlFor="toggle-private-account"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Private Account
              </Label>
            </div>
            <Switch
              id="toggle-private-account"
              checked={privacySettings.privateAccount}
              onCheckedChange={(val) =>
                handlePrivacyChange("privateAccount", val)
              }
              data-ocid="settings.switch"
            />
          </div>

          <div className="mx-4" style={dividerStyle} />

          {/* Hide Liked Videos */}
          <div className={rowBase}>
            <div className="flex items-center gap-3">
              <EyeOff className="w-5 h-5" style={{ color: mutedColor }} />
              <Label
                htmlFor="toggle-hide-liked"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Hide Liked Videos
              </Label>
            </div>
            <Switch
              id="toggle-hide-liked"
              checked={privacySettings.hideLiked}
              onCheckedChange={(val) => handlePrivacyChange("hideLiked", val)}
              data-ocid="settings.switch"
            />
          </div>
        </div>
      </section>

      {/* Data & Storage */}
      <section data-ocid="settings.section">
        {sectionHeader("Data & Storage")}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className={`${rowBase} justify-between`}>
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5" style={{ color: mutedColor }} />
              <span className="text-sm font-medium text-foreground">
                Clear Cache
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={cacheCleared}
              data-ocid="settings.secondary_button"
              style={{
                borderColor: "oklch(0.34 0.006 264)",
                background: "transparent",
                color: cacheCleared
                  ? "oklch(0.65 0.14 145)"
                  : "oklch(0.75 0.01 264)",
                fontSize: 12,
                minWidth: 110,
                transition: "color 0.2s",
              }}
            >
              {cacheCleared ? "Cache cleared \u2713" : "Clear Cache"}
            </Button>
          </div>
        </div>
      </section>

      {/* Logout */}
      <section data-ocid="settings.card">
        {sectionHeader("Session")}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl flex items-center justify-start gap-3 px-4 hover:bg-transparent active:scale-[0.98] transition-transform"
            onClick={handleLogout}
            data-ocid="settings.delete_button"
          >
            <LogOut className="w-5 h-5" style={{ color: redAccent }} />
            <span className="text-sm font-medium" style={{ color: redAccent }}>
              Log Out
            </span>
          </Button>
        </div>
      </section>

      <p
        className="text-center text-xs mt-4"
        style={{ color: "oklch(0.40 0.006 264)" }}
      >
        \u00a9 {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="underline hover:opacity-80"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
