import { useAuth } from "@/context/AuthContext";
import { Bookmark, LogOut, Settings, Shield, User } from "lucide-react";

const navItems = [
  { icon: User, label: "Profile" },
  { icon: Settings, label: "Settings" },
  { icon: Shield, label: "Privacy" },
];

interface MenuPageProps {
  onNavigate?: (route: string) => void;
}

export default function MenuPage({ onNavigate }: MenuPageProps) {
  const { authUser, logout } = useAuth();

  const myVideos = authUser
    ? Object.keys(localStorage)
        .filter((k) => k.startsWith("video_"))
        .map((k) => {
          try {
            return JSON.parse(localStorage.getItem(k) || "");
          } catch {
            return null;
          }
        })
        .filter(
          (v): v is { ownerId: string; views?: number } =>
            v !== null && v.ownerId === authUser.id,
        )
    : [];

  const totalVideos = myVideos.length;
  const totalViews = myVideos.reduce((s, v) => s + (v.views || 0), 0);

  return (
    <div className="animate-page-in py-6" data-ocid="menu.section">
      {/* User greeting */}
      {authUser && (
        <div
          className="flex items-center gap-3 mb-4 px-5 py-4 rounded-xl"
          style={{ background: "oklch(0.22 0.006 264)" }}
          data-ocid="menu.card"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
            style={{ background: "oklch(0.548 0.222 27)" }}
          >
            {authUser.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white font-semibold text-sm truncate">
              {authUser.name || authUser.username}
            </span>
            <span
              className="text-xs truncate"
              style={{ color: "oklch(0.55 0.01 264)" }}
            >
              @{authUser.username}
            </span>
            {authUser.email && (
              <span
                className="text-xs truncate"
                style={{ color: "oklch(0.45 0.01 264)" }}
              >
                {authUser.email}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Creator Stats */}
      {authUser && (
        <div className="flex gap-3 mb-6" data-ocid="menu.stats">
          <div
            className="flex-1 rounded-xl py-3 text-center"
            style={{ background: "oklch(0.22 0.006 264)" }}
          >
            <div className="text-lg font-bold text-white">{totalVideos}</div>
            <div className="text-xs" style={{ color: "oklch(0.55 0.01 264)" }}>
              Videos
            </div>
          </div>
          <div
            className="flex-1 rounded-xl py-3 text-center"
            style={{ background: "oklch(0.22 0.006 264)" }}
          >
            <div className="text-lg font-bold text-white">{totalViews}</div>
            <div className="text-xs" style={{ color: "oklch(0.55 0.01 264)" }}>
              Views
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-foreground mb-4">Menu</h2>

      <div className="flex flex-col gap-2">
        {navItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="flex items-center gap-4 h-14 px-5 rounded-xl text-foreground text-sm font-medium active:scale-[0.98] transition-transform"
            style={{ background: "oklch(0.22 0.006 264)" }}
            data-ocid={`menu.${label.toLowerCase().replace(" ", "_")}_button`}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: "oklch(0.55 0.01 264)" }}
            />
            {label}
          </button>
        ))}

        {/* Watch Later */}
        <button
          type="button"
          onClick={() => onNavigate?.("watchLater")}
          className="flex items-center gap-4 h-14 px-5 rounded-xl text-foreground text-sm font-medium active:scale-[0.98] transition-transform"
          style={{ background: "oklch(0.22 0.006 264)" }}
          data-ocid="menu.watch_later_button"
        >
          <Bookmark
            className="w-5 h-5"
            style={{ color: "oklch(0.55 0.01 264)" }}
          />
          Watch Later
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-4 h-14 px-5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform mt-2"
          style={{
            background: "oklch(0.22 0.006 264)",
            color: "oklch(0.548 0.222 27)",
            border: "1px solid oklch(0.548 0.222 27 / 0.35)",
          }}
          data-ocid="menu.logout_button"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
