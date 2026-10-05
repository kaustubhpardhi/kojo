import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/*
 * The display name lives in Supabase auth user metadata rather than its own
 * table: it needs no migration, no RLS, and it follows the account to any
 * device. Updating it fires a USER_UPDATED event, so AuthProvider re-renders
 * with the new name on its own.
 */

/** Full name, falling back to the Google profile name, then the email prefix. */
export function displayName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata as { display_name?: string; full_name?: string };
  const stored = meta?.display_name?.trim() || meta?.full_name?.trim();
  if (stored) return stored;
  const prefix = (user.email ?? "").split("@")[0].replace(/[._-]+/g, " ");
  return prefix ? titleCase(prefix) : "there";
}

/** Just the first word — what greetings use. */
export function firstName(user: User | null): string {
  return displayName(user).split(" ")[0];
}

/** Up to two letters for the avatar. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}

export async function updateDisplayName(name: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
  if (error) throw error;
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
