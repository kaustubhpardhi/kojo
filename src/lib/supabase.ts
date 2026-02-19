import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";

// Use placeholder during build when env is missing (e.g. CI); set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?
    process.env.NEXT_PUBLIC_SUPABASE_URL
  : "https://example.invalid";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);
