import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/context/AuthContext";
import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

function updateUser(id: string, data: Partial<AuthUser>) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const updated = users.map((u: AuthUser) =>
    u.id === id ? { ...u, ...data } : u,
  );
  localStorage.setItem("users", JSON.stringify(updated));
}

interface VerifyEmailPageProps {
  token: string;
  onDone: () => void;
}

export default function VerifyEmailPage({
  token,
  onDone,
}: VerifyEmailPageProps) {
  const [status, setStatus] = useState<"pending" | "success" | "invalid">(
    "pending",
  );

  useEffect(() => {
    const userId = localStorage.getItem(`verify_${token}`);
    if (!userId) {
      setStatus("invalid");
      return;
    }
    updateUser(userId, { verified: true });
    localStorage.removeItem(`verify_${token}`);

    // Update authUser if it's the same user
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "null");
      if (authUser && authUser.id === userId) {
        const updated = { ...authUser, verified: true };
        localStorage.setItem("authUser", JSON.stringify(updated));
      }
    } catch {}

    setStatus("success");

    // Remove token from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("verify");
    window.history.replaceState({}, "", url.toString());
  }, [token]);

  const RED = "oklch(0.548 0.222 27)";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ background: "oklch(0.148 0.004 264)" }}
      data-ocid="verify.page"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background: "oklch(0.178 0.005 264)",
          border: "1px solid oklch(0.24 0.006 264)",
        }}
      >
        {status === "pending" && (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.22 0.006 264)" }}
            >
              <span className="text-2xl animate-spin">⏳</span>
            </div>
            <p className="text-base font-semibold text-foreground">
              Verifying your email…
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle
              className="w-14 h-14"
              style={{ color: "oklch(0.65 0.2 160)" }}
            />
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">
                Email Verified!
              </h1>
              <p className="text-sm" style={{ color: "oklch(0.55 0.01 264)" }}>
                Your account is now active. Sign in to get started.
              </p>
            </div>
            <Button
              className="w-full h-11 rounded-xl font-semibold text-white active:scale-95 transition-transform"
              style={{
                background: RED,
                boxShadow: "0 4px 16px rgba(225,29,46,0.35)",
              }}
              onClick={onDone}
              data-ocid="verify.signin_button"
            >
              Go to Sign In
            </Button>
          </>
        )}

        {status === "invalid" && (
          <>
            <XCircle
              className="w-14 h-14"
              style={{ color: "oklch(0.548 0.222 27)" }}
            />
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">
                Invalid Link
              </h1>
              <p className="text-sm" style={{ color: "oklch(0.55 0.01 264)" }}>
                This verification link is invalid or has already been used.
              </p>
            </div>
            <Button
              className="w-full h-11 rounded-xl font-semibold text-white active:scale-95 transition-transform"
              style={{ background: RED }}
              onClick={onDone}
              data-ocid="verify.back_button"
            >
              Back to Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
