import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUser } from "@/context/AuthContext";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";

interface RecoverPageProps {
  onBack: () => void;
  onSuccess: (user: AuthUser) => void;
}

type Step = "request" | "pending";

function updateUser(id: string, data: Partial<AuthUser>) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const updated = users.map((u: AuthUser) =>
    u.id === id ? { ...u, ...data } : u,
  );
  localStorage.setItem("users", JSON.stringify(updated));
}

export default function RecoverPage({ onBack }: RecoverPageProps) {
  const [step, setStep] = useState<Step>("request");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // kept for updateUser reference — used in ResetPasswordPage
  void updateUser;

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
    localStorage.setItem(`reset_${token}`, user.id);
    setResetToken(token);
    setResetEmail(user.email || user.username);
    setStep("pending");
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?reset=${resetToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openResetLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?reset=${resetToken}`;
    window.location.href = url;
  };

  const RED = "oklch(0.548 0.222 27)";

  if (step === "pending") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center px-6 animate-page-in"
        style={{ background: "oklch(0.148 0.004 264)" }}
        data-ocid="recover.pending"
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-5"
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
              <KeyRound className="w-7 h-7" style={{ color: RED }} />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Reset Link Sent
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "oklch(0.55 0.01 264)" }}
            >
              A password reset link would be sent to{" "}
              <span className="text-white font-medium">{resetEmail}</span>.
            </p>
          </div>

          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: "oklch(0.22 0.006 264)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "oklch(0.45 0.008 264)" }}
            >
              Demo — Simulated Reset Link
            </p>
            <code
              className="text-xs break-all leading-relaxed"
              style={{ color: "oklch(0.75 0.15 160)" }}
            >
              {window.location.origin}
              {window.location.pathname}?reset={resetToken}
            </code>
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 h-9 rounded-lg text-sm font-semibold text-white active:scale-95 transition-transform"
                style={{ background: RED }}
                onClick={openResetLink}
                data-ocid="recover.open_reset_button"
              >
                Open Reset Page
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 px-3 rounded-lg text-sm active:scale-95 transition-transform"
                onClick={copyLink}
                data-ocid="recover.copy_link_button"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <button
            type="button"
            className="text-sm text-center active:opacity-70 transition-opacity"
            style={{ color: "oklch(0.55 0.01 264)" }}
            onClick={onBack}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

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
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
            style={{
              background: RED,
              boxShadow: "0 4px 20px rgba(225,29,46,0.4)",
            }}
          >
            S
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Forgot Password
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.55 0.01 264)" }}
            >
              Enter your username or email to receive a reset link
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
            Send Reset Link
          </Button>

          <button
            type="button"
            className="text-sm text-center active:opacity-70 transition-opacity"
            style={{ color: "oklch(0.55 0.01 264)" }}
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

export { updateUser };
