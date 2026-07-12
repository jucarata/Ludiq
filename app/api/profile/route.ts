import { NextResponse } from "next/server";
import { requirePrivyUserId } from "@/lib/privy/request-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeUsername,
  normalizeWalletAddress,
  usernameValidationMessage,
  validateUsername,
  type Profile,
} from "@/lib/profile/types";

type ProfileBody = {
  walletAddress?: string;
  email?: string | null;
  username?: string;
};

function uniqueConstraintResponse(error: {
  code?: string;
  message?: string;
  details?: string;
}) {
  const haystack = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (haystack.includes("wallet_address")) {
    return NextResponse.json(
      { error: "That wallet is already linked to another profile" },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: "That username is already taken" },
    { status: 409 },
  );
}

export async function GET(request: Request) {
  try {
    const privyUserId = await requirePrivyUserId(request);
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: (data as Profile | null) ?? null });
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const privyUserId = await requirePrivyUserId(request);
    const body = (await request.json()) as ProfileBody;

    const walletAddress = body.walletAddress
      ? normalizeWalletAddress(body.walletAddress)
      : null;
    const username = body.username ? normalizeUsername(body.username) : null;
    const email = body.email?.trim() || null;

    if (!walletAddress || !walletAddress.startsWith("0x")) {
      return NextResponse.json(
        { error: "A valid wallet address is required" },
        { status: 400 },
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json(
        { error: usernameValidationMessage(usernameError) },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("privy_user_id", privyUserId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          wallet_address: walletAddress,
          email,
          username,
          display_name: username,
        })
        .eq("privy_user_id", privyUserId)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return uniqueConstraintResponse(error);
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ profile: data as Profile });
    }

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        privy_user_id: privyUserId,
        wallet_address: walletAddress,
        email,
        username,
        display_name: username,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return uniqueConstraintResponse(error);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data as Profile }, { status: 201 });
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
