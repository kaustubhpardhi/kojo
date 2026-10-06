/**
 * Turns a PostgREST / Supabase error into a short toast line.
 * Detects the unmigrated-schema case so we don't just say "Couldn't…".
 */
export function friendlyError(err: unknown, fallback: string): string {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : err instanceof Error
        ? err.message
        : "";

  if (
    /owner_id does not exist|Could not find the table 'public\.templates'|column .* does not exist|PGRST205|42703/i.test(
      message,
    )
  ) {
    return "Database isn't migrated yet — run the custom_sessions SQL in Supabase.";
  }

  return fallback;
}
