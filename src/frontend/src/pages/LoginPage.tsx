import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface LoginPageProps {
  onSuccess: () => void;
}

type Tab = "signin" | "signup";

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setShowPw(false);
    setShowConfirmPw(false);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    resetForm();
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(
      (u: { username: string; password: string }) =>
        u.username === username.trim() && u.password === password,
    );
    if (!user) {
      setError("Invalid username or password.");
      return;
    }
    login(user);
    onSuccess();
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    const uname = username.trim();
    if (!uname) {
      setError("Please enter a username.");
      return;
    }
    if (uname.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find((u: { username: string }) => u.username === uname)) {
      setError("Username already taken. Choose a different name.");
      return;
    }
    const newUser = {
      id: String(Date.now()),
      username: uname,
      name: uname,
      password,
    };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    login(newUser);
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
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ background: "oklch(0.22 0.006 264)" }}
          data-ocid="login.tab"
        >
          {(["signin", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: tab === t ? "oklch(0.548 0.222 27)" : "transparent",
                color: tab === t ? "#fff" : "oklch(0.55 0.01 264)",
                borderRadius: "0.75rem",
              }}
              onClick={() => switchTab(t)}
              data-ocid={`login.${t}_tab`}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={tab === "signin" ? handleSignIn : handleSignUp}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="login-username"
              className="text-sm font-medium text-foreground"
            >
              Username
            </Label>
            <Input
              id="login-username"
              type="text"
              placeholder="Enter username"
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
                autoComplete={
                  tab === "signin" ? "current-password" : "new-password"
                }
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

          {tab === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="login-confirm-password"
                className="text-sm font-medium text-foreground"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="login-confirm-password"
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-11"
                  autoComplete="new-password"
                  data-ocid="login.confirm_input"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 active:scale-95 transition-transform"
                  style={{ color: "oklch(0.55 0.01 264)" }}
                  onClick={() => setShowConfirmPw((v) => !v)}
                  tabIndex={-1}
                  data-ocid="login.confirm_toggle"
                >
                  {showConfirmPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

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
            {tab === "signin" ? "Sign In" : "Create Account"}
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
