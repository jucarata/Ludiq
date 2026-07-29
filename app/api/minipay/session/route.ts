import { NextResponse } from "next/server";
import { minipayUserIdFromAddress } from "@/lib/minipay/identity";
import { issueMiniPaySessionToken } from "@/lib/minipay/session";
import {
  normalizeWalletAddress,
  type Profile,
} from "@/lib/profile/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SessionBody = {
  address?: string;
};

/**
 * MiniPay cannot SIWE (`personal_sign` unsupported). Address from the
 * injected provider is the identity; we issue an app session JWT and
 * create/recover the profile row keyed by wallet.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SessionBody;
    const walletAddress = body.address
      ? normalizeWalletAddress(body.address)
      : null;

    if (!walletAddress || !walletAddress.startsWith("0x") || walletAddress.length < 42) {
      return NextResponse.json(
        { error: "A valid wallet address is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: byWallet, error: walletLookupError } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (walletLookupError) {
      return NextResponse.json(
        { error: walletLookupError.message },
        { status: 500 },
      );
    }

    let profile = (byWallet as Profile | null) ?? null;

    if (!profile) {
      const userId = minipayUserIdFromAddress(walletAddress);
      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          privy_user_id: userId,
          wallet_address: walletAddress,
          email: null,
          username: null,
          display_name: null,
        })
        .select("*")
        .single();

      if (insertError) {
        // Race: another request created the row — re-fetch by wallet.
        if (insertError.code === "23505") {
          const { data: raced } = await supabase
            .from("profiles")
            .select("*")
            .eq("wallet_address", walletAddress)
            .maybeSingle();
          profile = (raced as Profile | null) ?? null;
        } else {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 },
          );
        }
      } else {
        profile = inserted as Profile;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
    }

    const token = issueMiniPaySessionToken({
      userId: profile.privy_user_id,
      walletAddress: profile.wallet_address,
    });

    return NextResponse.json({
      token,
      profile,
      needsUsername: !profile.username,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("MINIPAY_SESSION_SECRET") || message.includes("PRIVY_APP_SECRET")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
