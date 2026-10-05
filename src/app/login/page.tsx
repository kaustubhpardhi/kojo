"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendPasswordResetEmail, signInWithPassword, signUp } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [accountExists, setAccountExists] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await signInWithPassword(email.trim(), password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp(email.trim(), password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("user already exists")
      ) {
        setAccountExists(true);
        setResetSent(false);
        setMode("reset");
        setError("");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(email.trim());
      setResetSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F2F2F0] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-[10px] font-normal uppercase tracking-[0.25em] text-[#3A3A3A] mb-2">
          Workout log
        </p>
        <h1 className="font-display text-5xl font-bold text-[#C8FF00] tracking-tight mb-10">
          KOJO
        </h1>

        {mode === "reset" ? (
          <div className="border border-[#3A3A3A] p-6">
            <h2 className="text-lg font-bold text-[#F2F2F0] mb-2">
              {accountExists ? "Account exists" : "Reset password"}
            </h2>
            <p className="text-xs text-[#3A3A3A] tracking-wide mb-4">
              {resetSent
                ? "Check your inbox for a link to set a new password."
                : "We'll email you a link to set a new password."}
            </p>
            <form onSubmit={handleSendReset}>
              <input
                type="email"
                value={email}
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetSent(false);
                }}
                placeholder="YOUR@EMAIL.COM"
                className="w-full py-4 px-0 text-[#F2F2F0] text-lg font-bold tracking-wide bg-transparent border-0 border-b border-[#3A3A3A] focus:outline-none focus:border-[#C8FF00] placeholder:text-[#3A3A3A] placeholder:font-normal"
              />
              <button
                type="submit"
                disabled={loading || !email || resetSent}
                className="tap-flash w-full mt-6 py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest disabled:opacity-40"
              >
                {loading ? "Sending…" : resetSent ? "Link sent" : "Send reset link"}
              </button>
            </form>
            {error && (
              <p className="mt-4 text-xs text-[#3A3A3A] uppercase tracking-wider">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setAccountExists(false);
                setResetSent(false);
                setError("");
              }}
              className="mt-4 text-xs font-bold uppercase tracking-widest text-[#C8FF00] border-b border-[#C8FF00]"
            >
              Back to log in
            </button>
          </div>
        ) : (
          <form
            onSubmit={mode === "login" ? handleLogin : handleSignUp}
            className="flex flex-col gap-4"
          >
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOUR@EMAIL.COM"
              className="w-full py-4 px-0 text-[#F2F2F0] text-lg font-bold tracking-wide bg-transparent border-0 border-b border-[#3A3A3A] focus:outline-none focus:border-[#C8FF00] placeholder:text-[#3A3A3A] placeholder:font-normal"
            />
            <input
              type="password"
              value={password}
              required
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD (MIN 6)"
              className="w-full py-4 px-0 text-[#F2F2F0] text-lg font-bold tracking-wide bg-transparent border-0 border-b border-[#3A3A3A] focus:outline-none focus:border-[#C8FF00] placeholder:text-[#3A3A3A] placeholder:font-normal"
            />
            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="tap-flash flex-1 py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest disabled:opacity-40"
              >
                {loading
                  ? "…"
                  : mode === "login"
                    ? "Log in"
                    : "Create account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                }}
                className="tap-flash flex-1 py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest"
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </div>
            {error && (
              <p className="text-xs text-[#3A3A3A] uppercase tracking-wider">
                {error}
              </p>
            )}
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setAccountExists(false);
                  setResetSent(false);
                  setError("");
                }}
                className="self-start text-xs font-bold uppercase tracking-widest text-[#6A6A6A]"
              >
                Forgot password?
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
