import type { Route } from "@/App";
import { Clock, Home, Menu, Plus } from "lucide-react";

interface BottomNavProps {
  route: Route;
  onNavigate: (r: Route) => void;
}

const RED = "oklch(0.548 0.222 27)";
const INACTIVE = "oklch(0.50 0.01 264)";

export default function BottomNav({ route, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center"
      style={{
        background: "oklch(0.178 0.005 264)",
        borderTop: "1px solid oklch(0.24 0.006 264)",
      }}
      data-ocid="bottomnav.panel"
    >
      {/* Home */}
      <button
        type="button"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition-transform"
        onClick={() => onNavigate("home")}
        data-ocid="bottomnav.home_tab"
      >
        <Home
          className="w-5 h-5"
          style={{ color: route === "home" ? RED : INACTIVE }}
        />
        <span
          className="text-[11px] font-medium"
          style={{ color: route === "home" ? RED : INACTIVE }}
        >
          Home
        </span>
      </button>

      {/* Center upload + button */}
      <div className="flex-1 flex items-center justify-center relative">
        <button
          type="button"
          className="w-14 h-14 rounded-full flex items-center justify-center -mt-5 active:scale-95 transition-transform"
          style={{
            background: RED,
            boxShadow: "0 4px 16px rgba(225,29,46,0.5)",
          }}
          onClick={() => onNavigate("upload")}
          data-ocid="bottomnav.upload_button"
        >
          <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* History */}
      <button
        type="button"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition-transform"
        onClick={() => onNavigate("history")}
        data-ocid="bottomnav.history_tab"
      >
        <Clock
          className="w-5 h-5"
          style={{ color: route === "history" ? RED : INACTIVE }}
        />
        <span
          className="text-[11px] font-medium"
          style={{ color: route === "history" ? RED : INACTIVE }}
        >
          History
        </span>
      </button>

      {/* Settings / Menu */}
      <button
        type="button"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition-transform"
        onClick={() => onNavigate("settings")}
        data-ocid="bottomnav.menu_tab"
      >
        <Menu
          className="w-5 h-5"
          style={{ color: route === "settings" ? RED : INACTIVE }}
        />
        <span
          className="text-[11px] font-medium"
          style={{ color: route === "settings" ? RED : INACTIVE }}
        >
          Menu
        </span>
      </button>
    </nav>
  );
}
