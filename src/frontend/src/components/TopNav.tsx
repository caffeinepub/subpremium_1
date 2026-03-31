import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthUser } from "@/context/AuthContext";
import { Bell } from "lucide-react";
import { useEffect } from "react";

interface TopNavProps {
  authUser: AuthUser | null;
  onAvatarClick: () => void;
  notificationCount: number;
  onBellClick: () => void;
}

const LOGO_STYLES = `
  .logo-wrap {
    position: relative;
    display: inline-block;
    background: none !important;
    background-color: transparent !important;
    box-shadow: none !important;
  }

  .logo-seasonal {
    font-weight: 900;
    font-size: 22px;
    letter-spacing: 1px;
    position: relative;
    display: inline-block;
    background: none !important;
    background-color: transparent !important;
    -webkit-text-fill-color: unset;
    color: #FFD700;
    text-shadow:
      0 1px 0 #e6c200,
      0 2px 0 #ccac00,
      0 3px 0 #b89600,
      0 4px 4px rgba(0,0,0,0.4),
      0 8px 12px rgba(0,0,0,0.6),
      0 0 6px rgba(255, 0, 0, 0.25),
      0 0 8px rgba(0, 150, 255, 0.25);
  }

  /* Winter snow */
  [data-season="winter"] .logo-seasonal::before {
    content: "❄ ❄ ❄";
    position: absolute;
    top: -6px;
    left: 0;
    width: 100%;
    font-size: 10px;
    color: white;
    -webkit-text-fill-color: white;
    background: none !important;
    opacity: 0.6;
    animation: snow 6s linear infinite;
    filter: none;
    pointer-events: none;
  }

  /* Spring blossom */
  [data-season="spring"] .logo-seasonal::before {
    content: "🌸 🌸 🌸";
    position: absolute;
    top: -6px;
    left: 0;
    width: 100%;
    font-size: 12px;
    -webkit-text-fill-color: initial;
    background: none !important;
    opacity: 0.7;
    animation: blossom 6s linear infinite;
    filter: none;
    pointer-events: none;
  }

  /* Fall leaves */
  [data-season="fall"] .logo-seasonal::after {
    content: "🍂 🍁";
    position: absolute;
    bottom: -6px;
    right: 0;
    font-size: 12px;
    -webkit-text-fill-color: initial;
    background: none !important;
    opacity: 0.6;
    animation: leafFall 6s linear infinite;
    filter: none;
    pointer-events: none;
  }

  @keyframes snow {
    0%   { transform: translateY(-5px); opacity: 0; }
    50%  { opacity: 1; }
    100% { transform: translateY(8px); opacity: 0; }
  }
  @keyframes blossom {
    0%   { transform: translateY(-6px); opacity: 0; }
    50%  { opacity: 1; }
    100% { transform: translateY(10px); opacity: 0; }
  }
  @keyframes leafFall {
    0%   { transform: translateY(-5px); opacity: 0; }
    50%  { opacity: 1; }
    100% { transform: translateY(10px); opacity: 0; }
  }
`;

function detectSeason() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const month = new Date().getMonth();
      const isNorth = lat >= 0;
      let season = "winter";

      if (isNorth) {
        if (month >= 2 && month <= 4) season = "spring";
        else if (month >= 5 && month <= 7) season = "summer";
        else if (month >= 8 && month <= 10) season = "fall";
      } else {
        if (month >= 2 && month <= 4) season = "fall";
        else if (month >= 5 && month <= 7) season = "winter";
        else if (month >= 8 && month <= 10) season = "spring";
        else season = "summer";
      }

      document.body.setAttribute("data-season", season);
    },
    () => {
      const month = new Date().getMonth();
      let season = "winter";
      if (month >= 2 && month <= 4) season = "spring";
      else if (month >= 5 && month <= 7) season = "summer";
      else if (month >= 8 && month <= 10) season = "fall";
      document.body.setAttribute("data-season", season);
    },
  );
}

export default function TopNav({
  authUser,
  onAvatarClick,
  notificationCount,
  onBellClick,
}: TopNavProps) {
  useEffect(() => {
    detectSeason();
  }, []);

  const initials = authUser
    ? (authUser.name || authUser.username)
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center gap-3 px-4"
      style={{
        background: "oklch(0.178 0.005 264)",
        borderBottom: "1px solid oklch(0.24 0.006 264)",
      }}
      data-ocid="topnav.panel"
    >
      <style>{LOGO_STYLES}</style>
      <div className="flex items-center gap-2 flex-1">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: "oklch(0.548 0.222 27)" }}
        >
          S
        </div>
        <div className="logo-wrap">
          <span className="logo-seasonal">SUB PREMIUM</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          className="active:scale-95 transition-transform relative"
          style={{ color: "oklch(0.55 0.01 264)" }}
          onClick={onBellClick}
          data-ocid="topnav.bell_button"
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: "oklch(0.548 0.222 27)" }}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="active:scale-95 transition-transform"
          onClick={onAvatarClick}
          data-ocid="topnav.avatar_button"
        >
          <Avatar className="w-8 h-8">
            {authUser?.avatarUrl ? (
              <AvatarImage src={authUser.avatarUrl} alt={authUser.name} />
            ) : null}
            <AvatarFallback
              className="text-xs font-semibold"
              style={{
                background: "oklch(0.548 0.222 27)",
                color: "oklch(0.98 0 0)",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}
