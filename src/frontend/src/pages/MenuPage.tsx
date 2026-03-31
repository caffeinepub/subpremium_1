import { LogOut, Settings, Shield, User } from "lucide-react";

const items = [
  { icon: User, label: "Profile" },
  { icon: Settings, label: "Settings" },
  { icon: Shield, label: "Privacy" },
  { icon: LogOut, label: "Sign Out" },
];

export default function MenuPage() {
  return (
    <div className="animate-page-in py-6" data-ocid="menu.section">
      <h2 className="text-xl font-bold text-foreground mb-6">Menu</h2>
      <div className="flex flex-col gap-2">
        {items.map(({ icon: Icon, label }) => (
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
      </div>
    </div>
  );
}
