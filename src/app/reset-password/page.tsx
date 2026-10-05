"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LoadingScreen } from "@/components/LoadingScreen";
import { updatePassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await updatePassword(password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F2F2F0] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-5xl font-bold text-[#C8FF00] tracking-tight mb-10">
          KOJO
        </h1>
        {user ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-[#6A6A6A] tracking-wide">
              Set a new password for {user.email}
            </p>
            <input
              type="password"
              value={password}
              required
              minLength={6}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="NEW PASSWORD (MIN 6)"
              className="w-full py-4 px-0 text-[#F2F2F0] text-lg font-bold tracking-wide bg-transparent border-0 border-b border-[#3A3A3A] focus:outline-none focus:border-[#C8FF00] placeholder:text-[#3A3A3A] placeholder:font-normal"
            />
            <button
              type="submit"
              disabled={loading || password.length < 6}
              className="tap-flash w-full mt-2 py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest disabled:opacity-40"
            >
              {loading ? "Saving…" : "Save password"}
            </button>
            {error && (
              <p className="text-xs text-[#3A3A3A] uppercase tracking-wider">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[#6A6A6A] tracking-wide">
              This reset link is invalid or has expired. Request a new one from
              the login page.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="tap-flash w-full py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest"
            >
              Back to log in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
