import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username or email.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    const name = username.includes("@") ? username.split("@")[0] : username;
    const id = name.toLowerCase().replace(/\s+/g, "_");
    login({ id, username: name, name });
    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6 animate-page-in"
      style={{ background: "oklch(0.148 0.004 264)" }}
      data-ocid="login.page"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{
          background: "oklch(0.178 0.005 264)",
          border: "1px solid oklch(0.24 0.006 264)",
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
            style={{
              background: "oklch(0.548 0.222 27)",
              boxShadow: "0 4px 20px rgba(225,29,46,0.4)",
            }}
          >
            S
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              SubPremium
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.55 0.01 264)" }}
            >
              Sign in to your account
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="login-username"
              className="text-sm font-medium text-foreground"
            >
              Username or Email
            </Label>
            <Input
              id="login-username"
              type="text"
              placeholder="Enter username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              autoComplete="username"
              data-ocid="login.input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="login-password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-11"
                autoComplete="current-password"
                data-ocid="login.textarea"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 active:scale-95 transition-transform"
                style={{ color: "oklch(0.55 0.01 264)" }}
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                data-ocid="login.toggle"
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="text-sm text-destructive"
              data-ocid="login.error_state"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 rounded-xl font-semibold text-white mt-1 active:scale-95 transition-transform"
            style={{
              background: "oklch(0.548 0.222 27)",
              boxShadow: "0 4px 16px rgba(225,29,46,0.35)",
            }}
            data-ocid="login.submit_button"
          >
            Sign In
          </Button>
        </form>

        <p
          className="text-center text-xs"
          style={{ color: "oklch(0.45 0.008 264)" }}
        >
          &copy; {new Date().getFullYear()}. Built with love using{" "}
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
    </div>
  );
}
