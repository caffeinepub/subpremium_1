import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthUser } from "@/context/AuthContext";
import { Bell } from "lucide-react";

interface TopNavProps {
  authUser: AuthUser | null;
  onAvatarClick: () => void;
  notificationCount: number;
  onBellClick: () => void;
}

export default function TopNav({
  authUser,
  onAvatarClick,
  notificationCount,
  onBellClick,
}: TopNavProps) {
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
      <div className="flex items-center gap-2 flex-1">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: "oklch(0.548 0.222 27)" }}
        >
          S
        </div>
        <span
          className="font-bold text-white text-sm tracking-widest uppercase"
          style={{ letterSpacing: "0.12em" }}
        >
          SUB PREMIUM
        </span>
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
