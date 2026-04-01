import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUser } from "@/context/AuthContext";
import { CheckCircle, Eye, EyeOff, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

function updateUser(id: string, data: Partial<AuthUser>) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const updated = users.map((u: AuthUser) =>
    u.id === id ? { ...u, ...data } : u,
  );
  localStorage.setItem("users", JSON.stringify(updated));
  return updated.find((u: AuthUser) => u.id === id) as AuthUser | undefined;
}

interface ResetPasswordPageProps {
  token: string;
  onDone: () => void;
  onSuccess: (user: AuthUser) => void;
}

export default function ResetPasswordPage({
  token,
  onDone,
  onSuccess,
}: ResetPasswordPageProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem(`reset_${token}`);
    if (uid) {
      setUserId(uid);
      setValid(true);
    } else {
      setValid(false);
    }
    // Clean token from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    window.history.replaceState({}, "", url.toString());
  }, [token]);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

    if (!userId) return;
    const updatedUser = updateUser(userId, { password: newPassword });
    localStorage.removeItem(`reset_${token}`);

    // Auto-login
    if (updatedUser) {
      localStorage.setItem("authUser", JSON.stringify(updatedUser));
      setDone(true);
      setTimeout(() => onSuccess(updatedUser), 1500);
    } else {
      setDone(true);
      setTimeout(() => onDone(), 1500);
    }
  };

  const RED = "oklch(0.548 0.222 27)";

  if (valid === null) return null;

  if (!valid) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center px-6"
        style={{ background: "oklch(0.148 0.004 264)" }}
        data-ocid="reset.invalid"
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-6 text-center"
          style={{
            background: "oklch(0.178 0.005 264)",
            border: "1px solid oklch(0.24 0.006 264)",
          }}
        >
          <XCircle className="w-14 h-14" style={{ color: RED }} />
          <div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-sm" style={{ color: "oklch(0.55 0.01 264)" }}>
              This password reset link is invalid or has already been used.
            </p>
          </div>
          <Button
            className="w-full h-11 rounded-xl font-semibold text-white active:scale-95 transition-transform"
            style={{ background: RED }}
            onClick={onDone}
            data-ocid="reset.back_button"
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

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
            <p className="text-sm" style={{ color: "oklch(0.55 0.01 264)" }}>
              You're being signed in automatically…
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.55 0.01 264)" }}
            >
              Choose a strong password for your account
            </p>
          </div>
        </div>

        <form onSubmit={handleReset} className="flex flex-col gap-4">
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
                style={{ color: "oklch(0.55 0.01 264)" }}
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
                style={{ color: "oklch(0.55 0.01 264)" }}
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
