"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/** Set password for an existing user by email (e.g. migrated from magic link). No email sent. Server-only. */
export async function setPasswordForEmail(
  email: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const emailTrimmed = email.trim().toLowerCase();
  if (!emailTrimmed || !newPassword || newPassword.length < 6) {
    return { error: "Email and password (min 6 chars) required" };
  }

  try {
    const supabase = createAdminClient();
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listError) return { error: listError.message };
    const user = users?.find((u) => u.email?.toLowerCase() === emailTrimmed);
    if (!user) return { error: "No account found with this email" };

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    );
    if (updateError) return { error: updateError.message };
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to set password";
    return { error: message };
  }
}
