"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Mark";
import { sendPasswordResetEmail, signInWithPassword, signUp } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";

type Mode = "login" | "signup" | "reset";

const COPY: Record<Mode, { title: string; blurb: string; cta: string }> = {
  login: {
    title: "Welcome back",
    blurb: "Pick up where you left off.",
    cta: "Log in",
  },
  signup: {
    title: "Let's get lifting",
    blurb: "Build your own workouts and watch the numbers climb.",
    cta: "Create account",
  },
  reset: {
    title: "Reset your password",
    blurb: "We'll email you a link to set a new one.",
    cta: "Send reset link",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/");
  }, [authLoading, user, router]);

  const copy = COPY[mode];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(email.trim());
        setSent(true);
        return;
      }
      if (mode === "login") {
        await signInWithPassword(email.trim(), password);
      } else {
        if (password.length < 6) {
          setError("Password needs at least 6 characters");
          return;
        }
        await signUp(email.trim(), password);
      }
      router.replace("/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (
        mode === "signup" &&
        /already (registered|exists)/i.test(message)
      ) {
        setMode("reset");
        setError("That email already has an account — reset the password instead.");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setSent(false);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 pb-safe pt-safe">
      {/* No entry fade here: this must be readable before JS hydrates. */}
      <div>
        <div className="flex items-center gap-2.5">
          <Mark size={52} animated />
          <span className="font-display text-[28px] font-extrabold tracking-[-0.02em]">
            {APP_NAME}
          </span>
        </div>
        <h1 className="mt-6 font-display text-[34px] font-extrabold leading-tight tracking-[-0.02em]">
          {copy.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-fg-muted">{copy.blurb}</p>
      </div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[var(--radius-lg)] bg-surface p-5 shadow-soft"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Icon name="check" size={24} strokeWidth={2.6} />
          </span>
          <p className="mt-3 font-display text-[17px] font-bold">Check your inbox</p>
          <p className="mt-1 text-[14px] text-fg-muted">
            We sent a reset link to {email.trim()}. Open it on this device to set a new
            password.
          </p>
          <Button block size="lg" variant="secondary" className="mt-4" onClick={() => switchMode("login")}>
            Back to log in
          </Button>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-3">
          <Field
            type="email"
            label="Email"
            value={email}
            required
            autoComplete="email"
            inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />

          {mode !== "reset" && (
            <Field
              type="password"
              label="Password"
              value={password}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 text-[13.5px] text-danger">
              <Icon name="x" size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <Button
            block
            size="xl"
            type="submit"
            loading={loading}
            disabled={!email || (mode !== "reset" && !password)}
            className="!mt-5"
          >
            {copy.cta}
          </Button>

          <div className="flex flex-col items-center gap-1 pt-2">
            {mode === "login" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => switchMode("signup")}>
                  New here? Create an account
                </Button>
                <Button variant="ghost" size="sm" onClick={() => switchMode("reset")}>
                  Forgot your password?
                </Button>
              </>
            )}
            {mode === "signup" && (
              <Button variant="ghost" size="sm" onClick={() => switchMode("login")}>
                Already have an account? Log in
              </Button>
            )}
            {mode === "reset" && (
              <Button variant="ghost" size="sm" onClick={() => switchMode("login")}>
                Back to log in
              </Button>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
