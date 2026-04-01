import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUser } from "@/context/AuthContext";
import { saveToken } from "@/lib/authTokens";
import { KeyRound } from "lucide-react";
import { useState } from "react";

interface RecoverPageProps {
  onBack: () => void;
  onResetReady: () => void;
  onSuccess: (user: AuthUser) => void;
}

const RED = "oklch(0.548 0.222 27)";
const MUTED = "oklch(0.55 0.01 264)";

export default function RecoverPage({
  onBack,
  onResetReady,
}: RecoverPageProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [error, setError] = useState("");

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!usernameOrEmail.trim()) {
      setError("Please enter your username or email.");
      return;
    }
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(
      (u: AuthUser) =>
        u.username === usernameOrEmail.trim() ||
        u.email === usernameOrEmail.trim(),
    );
    if (!user) {
      setError("No account found with that username or email.");
      return;
    }

    const token = crypto.randomUUID();
    saveToken({
      type: "reset",
      token,
      userId: user.id,
      expires: Date.now() + 15 * 60 * 1000,
    });

    onResetReady();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6 animate-page-in"
      style={{ background: "oklch(0.148 0.004 264)" }}
      data-ocid="recover.page"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{
          background: "oklch(0.178 0.005 264)",
          border: "1px solid oklch(0.24 0.006 264)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(0.22 0.006 264)" }}
          >
            <KeyRound className="w-7 h-7" style={{ color: RED }} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Forgot Password
            </h1>
            <p className="text-sm mt-1" style={{ color: MUTED }}>
              Enter your username or email to get a reset code
            </p>
          </div>
        </div>

        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="recover-ident"
              className="text-sm font-medium text-foreground"
            >
              Username or Email
            </Label>
            <Input
              id="recover-ident"
              type="text"
              placeholder="Enter username or email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              data-ocid="recover.username_input"
            />
          </div>

          {error && (
            <p
              className="text-sm text-destructive"
              data-ocid="recover.error_state"
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
            data-ocid="recover.submit_button"
          >
            Get Reset Code
          </Button>

          <button
            type="button"
            className="text-sm text-center active:opacity-70 transition-opacity"
            style={{ color: MUTED }}
            onClick={onBack}
            data-ocid="recover.back_button"
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
