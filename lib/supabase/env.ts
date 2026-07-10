const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseEnv() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or the public key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY). Copy .env.local.example to .env.local.",
    );
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseKey,
  };
}

export function getSupabaseServiceRoleKey(): string {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (Supabase Dashboard → Project Settings → API).",
    );
  }

  return supabaseServiceRoleKey;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}
