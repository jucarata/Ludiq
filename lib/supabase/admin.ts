import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    const { url } = getSupabaseEnv();
    adminClient = createClient<Database>(url, getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
