import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { saveToken } from "@/lib/authTokens";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface LoginPageProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
  onVerifyNeeded: (userId: string) => void;
}

type Tab = "signin" | "signup";

const RED = "oklch(0.548 0.222 27)";

function saveUser(u: object) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  users.push(u);
  localStorage.setItem("users", JSON.stringify(users));
}

export default function LoginPage({
  onSuccess,
  onForgotPassword,
  onVerifyNeeded,
}: LoginPageProps) {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRecoveryAnswer("");
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
    if (user.verified === false) {
      setError("Please verify your email before signing in.");
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
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
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
    if (!recoveryAnswer.trim()) {
      setError("Please enter a recovery answer.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find((u: { username: string }) => u.username === uname)) {
      setError("Username already taken. Choose a different name.");
      return;
    }
    if (users.find((u: { email: string }) => u.email === email.trim())) {
      setError("An account with this email already exists.");
      return;
    }

    const newUser = {
      id: String(Date.now()),
      username: uname,
      name: uname,
      email: email.trim(),
      password,
      recoveryAnswer: recoveryAnswer.trim(),
      verified: false,
    };
    saveUser(newUser);

    const token = crypto.randomUUID();
    saveToken({
      type: "verify",
      token,
      userId: newUser.id,
      expires: Date.now() + 15 * 60 * 1000,
    });

    onVerifyNeeded(newUser.id);
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
              background: RED,
              boxShadow: "0 4px 20px rgba(225,29,46,0.4)",
            }}
          >
            S
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            SubPremium
          </h1>
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
                background: tab === t ? RED : "transparent",
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

          {tab === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="login-email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                autoComplete="email"
                data-ocid="login.email_input"
              />
            </div>
          )}

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
            <>
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

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="login-recovery"
                  className="text-sm font-medium text-foreground"
                >
                  Recovery Answer{" "}
                  <span
                    className="font-normal"
                    style={{ color: "oklch(0.55 0.01 264)" }}
                  >
                    (e.g. favorite color)
                  </span>
                </Label>
                <Input
                  id="login-recovery"
                  type="text"
                  placeholder="e.g. blue"
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  autoComplete="off"
                  data-ocid="login.recovery_input"
                />
              </div>
            </>
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
              background: RED,
              boxShadow: "0 4px 16px rgba(225,29,46,0.35)",
            }}
            data-ocid="login.submit_button"
          >
            {tab === "signin" ? "Sign In" : "Create Account"}
          </Button>

          {tab === "signin" && (
            <button
              type="button"
              className="text-sm text-center active:opacity-70 transition-opacity"
              style={{ color: "oklch(0.55 0.01 264)" }}
              onClick={onForgotPassword}
              data-ocid="login.forgot_password_button"
            >
              Forgot Password?
            </button>
          )}
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
