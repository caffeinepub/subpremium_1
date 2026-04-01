import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUser } from "@/context/AuthContext";
import { deleteToken, getToken, getUpdatedUser } from "@/lib/authTokens";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ResetPasswordPageProps {
  onDone: () => void;
  onSuccess: (user: AuthUser) => void;
}

const RED = "oklch(0.548 0.222 27)";
const MUTED = "oklch(0.55 0.01 264)";

// Find the most recent unused reset token and return it for the hint
function getLatestResetToken(): string | null {
  const tokens = JSON.parse(localStorage.getItem("tokens") || "[]");
  const resetTokens = tokens.filter(
    (t: { type: string; expires: number }) =>
      t.type === "reset" && t.expires > Date.now(),
  );
  if (!resetTokens.length) return null;
  resetTokens.sort(
    (a: { expires: number }, b: { expires: number }) => b.expires - a.expires,
  );
  return resetTokens[0].token as string;
}

export default function ResetPasswordPage({
  onDone,
  onSuccess,
}: ResetPasswordPageProps) {
  const [token, setToken] = useState(() => getLatestResetToken() ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setError("Please enter your reset code.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const entry = getToken(trimmedToken, "reset");
    if (!entry) {
      setError("Invalid reset code. Please request a new one.");
      return;
    }
    if (Date.now() > entry.expires) {
      deleteToken(trimmedToken);
      setError("This reset code has expired. Please request a new one.");
      return;
    }

    const updatedUser = getUpdatedUser(entry.userId, {
      password: newPassword,
    }) as AuthUser | undefined;
    deleteToken(trimmedToken);

    if (updatedUser) {
      const verified = { ...updatedUser, verified: true };
      localStorage.setItem("authUser", JSON.stringify(verified));
      setDone(true);
      setTimeout(() => onSuccess(verified), 1200);
    } else {
      setDone(true);
      setTimeout(() => onDone(), 1200);
    }
  };

  if (done) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center px-6"
        style={{ background: "oklch(0.148 0.004 264)" }}
        data-ocid="reset.success"
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-6 text-center"
          style={{
            background: "oklch(0.178 0.005 264)",
            border: "1px solid oklch(0.24 0.006 264)",
          }}
        >
          <CheckCircle
            className="w-14 h-14"
            style={{ color: "oklch(0.65 0.2 160)" }}
          />
          <div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Password Updated!
            </h1>
            <p className="text-sm" style={{ color: MUTED }}>
              Signing you in automatically…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Hint: show the latest available reset token
  const hintToken = getLatestResetToken();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6 animate-page-in"
      style={{ background: "oklch(0.148 0.004 264)" }}
      data-ocid="reset.page"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{
          background: "oklch(0.178 0.005 264)",
          border: "1px solid oklch(0.24 0.006 264)",
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
            style={{
              background: RED,
              boxShadow: "0 4px 20px rgba(225,29,46,0.4)",
            }}
          >
            S
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Set New Password
            </h1>
            <p className="text-sm mt-1" style={{ color: MUTED }}>
              Enter your reset code and choose a new password
            </p>
          </div>
        </div>

        {hintToken && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.22 0.006 264)",
              border: "1px solid oklch(0.28 0.006 264)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "oklch(0.45 0.008 264)" }}
            >
              Your reset code
            </p>
            <code
              className="text-xs break-all leading-relaxed"
              style={{ color: "oklch(0.75 0.15 160)" }}
            >
              {hintToken}
            </code>
          </div>
        )}

        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="reset-code"
              className="text-sm font-medium text-foreground"
            >
              Reset Code
            </Label>
            <Input
              id="reset-code"
              type="text"
              placeholder="Paste your reset code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
              data-ocid="reset.code_input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="reset-password"
              className="text-sm font-medium text-foreground"
            >
              New Password
            </Label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showPw ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-11"
                autoComplete="new-password"
                data-ocid="reset.password_input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 active:scale-95 transition-transform"
                style={{ color: MUTED }}
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="reset-confirm"
              className="text-sm font-medium text-foreground"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="reset-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-11"
                autoComplete="new-password"
                data-ocid="reset.confirm_input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 active:scale-95 transition-transform"
                style={{ color: MUTED }}
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? (
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
              data-ocid="reset.error_state"
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
            data-ocid="reset.submit_button"
          >
            Reset Password
          </Button>

          <button
            type="button"
            className="text-sm text-center active:opacity-70 transition-opacity"
            style={{ color: MUTED }}
            onClick={onDone}
            data-ocid="reset.back_button"
          >
            Back to Sign In
          </button>
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
