import { NextResponse } from "next/server";
import { requirePrivyUserId } from "@/lib/privy/request-auth";
import type { Profile } from "@/lib/profile/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SpendBody = {
  amount?: number;
  reason?: string;
};

const ALLOWED_REASONS = new Set(["dice_reroll"]);

export async function POST(request: Request) {
  try {
    const privyUserId = await requirePrivyUserId(request);
    const body = (await request.json()) as SpendBody;
    const amount = body.amount;
    const reason = body.reason?.trim() ?? "";

    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!ALLOWED_REASONS.has(reason)) {
      return NextResponse.json({ error: "Invalid spend reason" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "Profile required" }, { status: 400 });
    }

    const typed = profile as Profile;
    if ((typed.koins ?? 0) < amount) {
      return NextResponse.json(
        { error: "Insufficient Koins" },
        { status: 402 },
      );
    }

    const { data: newTotal, error: spendError } = await supabase.rpc(
      "adjust_profile_koins",
      {
        p_profile_id: typed.id,
        p_delta: -amount,
      },
    );

    if (spendError) {
      const msg = spendError.message.toLowerCase();
      if (msg.includes("insufficient")) {
        return NextResponse.json(
          { error: "Insufficient Koins" },
          { status: 402 },
        );
      }
      return NextResponse.json({ error: spendError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      spent: amount,
      reason,
      koins: typeof newTotal === "number" ? newTotal : typed.koins - amount,
    });
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
