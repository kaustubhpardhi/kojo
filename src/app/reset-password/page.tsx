"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Mark";
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
      setError("That needs to be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await updatePassword(password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't set that password.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 pb-safe pt-safe">
      <div>
        <Mark size={56} />
        <h1 className="mt-6 font-display text-[34px] font-extrabold leading-tight tracking-[-0.02em]">
          {user ? "Set a new password" : "This link expired"}
        </h1>
        <p className="mt-1.5 text-[15px] text-fg-muted">
          {user
            ? `You're signed in as ${user.email}.`
            : "Reset links are single-use and time limited. Request a fresh one."}
        </p>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <Field
            type="password"
            label="New password"
            value={password}
            required
            minLength={6}
            autoFocus
            autoComplete="new-password"
            placeholder="At least 6 characters"
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="flex items-start gap-2 text-[13.5px] text-danger">
              <Icon name="x" size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <Button
            type="submit"
            block
            size="xl"
            loading={loading}
            disabled={password.length < 6}
            className="mt-2"
          >
            Save password
          </Button>
        </form>
      ) : (
        <Button
          block
          size="xl"
          variant="secondary"
          className="mt-8"
          onClick={() => router.push("/login")}
        >
          Back to log in
        </Button>
      )}
    </main>
  );
}
