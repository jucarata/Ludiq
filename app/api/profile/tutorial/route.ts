import { NextResponse } from "next/server";
import { requirePrivyUserId } from "@/lib/privy/request-auth";
import type { Profile } from "@/lib/profile/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** Mark the authenticated profile's onboarding tutorial as completed. */
export async function POST(request: Request) {
  try {
    const privyUserId = await requirePrivyUserId(request);
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .update({ tutorial_completed: true })
      .eq("privy_user_id", privyUserId)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: data as Profile });
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
