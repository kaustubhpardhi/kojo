"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithGoogle, signInWithMagicLink } from "@/lib/auth";
import { useTheme } from "@/components/ThemeProvider";
import { Particles } from "@/components/Particles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await signInWithMagicLink(email);
      setSent(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to send magic link",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden">
      <Particles />

      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 w-10 h-10 flex items-center justify-center transition-all active:opacity-60"
      >
        <span className="text-xl opacity-80">
          {theme === "dark" ? "☼" : "☾"}
        </span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-block mb-3"
          >
            <h1
              className="text-6xl font-black tracking-tight neon-text"
              style={{
                fontFamily: "var(--font-jp)",
                color: "var(--accent-primary)",
              }}
            >
              kōjō
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-[10px] tracking-[0.5em] uppercase opacity-40 mb-8"
            style={{ color: "var(--text-tertiary)" }}
          >
            工場 · workout log
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-sm tracking-wider font-light italic opacity-60"
            style={{ color: "var(--text-secondary)" }}
          >
            鍛える、記録する、超える
          </motion.p>
        </div>

        {!sent ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-4"
          >
            {/* Magic Link */}
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full py-4 px-6 rounded-2xl text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-4 px-6 rounded-2xl text-base font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-20 translate-z-0"
                style={{
                  background: "var(--accent-primary)",
                  color: "#fff",
                  boxShadow: "0 8px 30px var(--accent-glow)",
                }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending
                  </span>
                ) : (
                  "Send Magic Link ✦"
                )}
              </button>
            </form>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-center"
                style={{ color: "var(--amrap-color)" }}
              >
                {error}
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-2xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div className="text-5xl mb-4">📨</div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Check your email
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              We sent a magic link to <strong>{email}</strong>
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm underline"
              style={{ color: "var(--accent-primary)" }}
            >
              Use a different email
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
