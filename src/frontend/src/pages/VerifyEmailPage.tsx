import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import type { AuthUser } from "@/context/AuthContext";
import { deleteToken, getToken, updateUser } from "@/lib/authTokens";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

interface VerifyEmailPageProps {
  userId: string;
  onSuccess: () => void;
  onBack: () => void;
}

const RED = "oklch(0.548 0.222 27)";
const MUTED = "oklch(0.55 0.01 264)";

export default function VerifyEmailPage({
  userId,
  onSuccess,
  onBack,
}: VerifyEmailPageProps) {
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter your verification code.");
      return;
    }

    const entry = getToken(trimmed, "verify");
    if (!entry) {
      setError("Invalid code. Check and try again.");
      return;
    }
    if (entry.userId !== userId) {
      setError("This code does not belong to your account.");
      return;
    }
    if (Date.now() > entry.expires) {
      deleteToken(trimmed);
      setError("This code has expired. Please sign up again.");
      return;
    }

    updateUser(userId, { verified: true });
    deleteToken(trimmed);

    // Auto-login
    const users: AuthUser[] = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u) => u.id === userId);
    if (user) {
      const verified = { ...user, verified: true };
      login(verified);
    }
    onSuccess();
  };

  // Find the pending token to show a hint (the token itself is the "code")
  const tokens = JSON.parse(localStorage.getItem("tokens") || "[]");
  const pendingToken = tokens.find(
    (t: { type: string; userId: string }) =>
      t.type === "verify" && t.userId === userId,
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6 animate-page-in"
      style={{ background: "oklch(0.148 0.004 264)" }}
      data-ocid="verify.page"
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
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(0.22 0.006 264)" }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: RED }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Verify Your Account
            </h1>
            <p
              className="text-sm mt-1 leading-relaxed"
              style={{ color: MUTED }}
            >
              Enter the verification code to activate your account.
            </p>
          </div>
        </div>

        {pendingToken && (
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
              Your verification code
            </p>
            <code
              className="text-xs break-all leading-relaxed"
              style={{ color: "oklch(0.75 0.15 160)" }}
            >
              {pendingToken.token}
            </code>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="verify-code"
              className="text-sm font-medium text-foreground"
            >
              Verification Code
            </Label>
            <Input
              id="verify-code"
              type="text"
              placeholder="Paste your code here"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 rounded-xl border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
              data-ocid="verify.code_input"
            />
          </div>

          {error && (
            <p
              className="text-sm text-destructive"
              data-ocid="verify.error_state"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 rounded-xl font-semibold text-white active:scale-95 transition-transform"
            style={{
              background: RED,
              boxShadow: "0 4px 16px rgba(225,29,46,0.35)",
            }}
            data-ocid="verify.submit_button"
          >
            Verify Account
          </Button>

          <button
            type="button"
            className="text-sm text-center active:opacity-70 transition-opacity"
            style={{ color: MUTED }}
            onClick={onBack}
            data-ocid="verify.back_button"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
