import { type ReactNode, createContext, useContext, useState } from "react";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  password?: string;
  recoveryAnswer?: string;
  email?: string;
  verified?: boolean;
}

interface AuthContextValue {
  authUser: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateProfile: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("authUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (user: AuthUser) => {
    localStorage.setItem("authUser", JSON.stringify(user));
    setAuthUser(user);
  };

  const logout = () => {
    localStorage.removeItem("authUser");
    setAuthUser(null);
  };

  const updateProfile = (partial: Partial<AuthUser>) => {
    setAuthUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("authUser", JSON.stringify(updated));

      // Sync all owned videos with latest username/avatar
      for (const k of Object.keys(localStorage).filter((k) =>
        k.startsWith("video_"),
      )) {
        try {
          const v = JSON.parse(localStorage.getItem(k) || "");
          if (v && v.ownerId === updated.id) {
            v.ownerName = updated.username;
            v.avatar = updated.avatarUrl || "";
            localStorage.setItem(k, JSON.stringify(v));
          }
        } catch {}
      }

      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ authUser, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
