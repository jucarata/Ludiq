import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyPrivyAuthToken } from "@/lib/privy/server";
import {
  normalizeUsername,
  normalizeWalletAddress,
  validateUsername,
  type Profile,
} from "@/lib/profile/types";

type ProfileBody = {
  walletAddress?: string;
  email?: string | null;
  username?: string;
};

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

async function requirePrivyUserId(request: Request): Promise<string> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const claims = await verifyPrivyAuthToken(token);
    return claims.user_id;
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
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
      return NextResponse.json({ error: usernameError }, { status: 400 });
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
          return NextResponse.json(
            { error: "That username is already taken" },
            { status: 409 },
          );
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
        return NextResponse.json(
          { error: "That username is already taken" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data as Profile }, { status: 201 });
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
