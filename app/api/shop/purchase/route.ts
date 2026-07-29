import { NextResponse } from "next/server";
import { verifyPurchaseTransaction } from "@/lib/celo/competitive";
import { requirePrivyUserId } from "@/lib/privy/request-auth";
import { normalizeWalletAddress, type Profile } from "@/lib/profile/types";
import {
  shopOfferIdFromSlug,
  shopOfferPriceRaw,
  type ShopOffer,
} from "@/lib/shop/offers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type PurchaseBody = {
  offerId?: string;
  txHash?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await requirePrivyUserId(request);
    const body = (await request.json()) as PurchaseBody;
    const offerId = body.offerId?.trim();
    const txHash = body.txHash?.trim().toLowerCase();

    if (!offerId || !txHash) {
      return NextResponse.json(
        { error: "offerId and txHash are required" },
        { status: 400 },
      );
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
    if (!profile?.wallet_address || !profile.username) {
      return NextResponse.json(
        { error: "Complete your profile with a wallet to buy Koins" },
        { status: 400 },
      );
    }

    const typedProfile = profile as Profile;

    const { data: existingPurchase } = await supabase
      .from("koin_purchases")
      .select("id, koins, price_usdt")
      .eq("tx_hash", txHash)
      .maybeSingle();

    if (existingPurchase) {
      return NextResponse.json({
        ok: true,
        alreadyCredited: true,
        koins: existingPurchase.koins,
        profile: typedProfile,
      });
    }

    const { data: offer, error: offerError } = await supabase
      .from("shop_offers")
      .select("*")
      .eq("id", offerId)
      .eq("active", true)
      .maybeSingle();

    if (offerError) {
      return NextResponse.json({ error: offerError.message }, { status: 500 });
    }
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const typedOffer = offer as ShopOffer;
    const onchainOfferId = shopOfferIdFromSlug(typedOffer.slug);
    const expectedAmount = shopOfferPriceRaw(typedOffer.price_usdt);
    const buyerWallet = normalizeWalletAddress(typedProfile.wallet_address);

    try {
      await verifyPurchaseTransaction({
        txHash,
        expectedOfferId: onchainOfferId,
        expectedBuyer: buyerWallet,
        expectedAmount,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not verify purchase";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("koin_purchases")
      .insert({
        profile_id: typedProfile.id,
        offer_id: typedOffer.id,
        koins: typedOffer.koins,
        price_usdt: typedOffer.price_usdt,
        tx_hash: txHash,
        buyer_wallet: buyerWallet,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({
          ok: true,
          alreadyCredited: true,
          koins: typedOffer.koins,
        });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: newTotal, error: creditError } = await supabase.rpc(
      "adjust_profile_koins",
      {
        p_profile_id: typedProfile.id,
        p_delta: typedOffer.koins,
      },
    );

    if (creditError) {
      await supabase.from("koin_purchases").delete().eq("id", inserted.id);
      return NextResponse.json({ error: creditError.message }, { status: 500 });
    }

    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", typedProfile.id)
      .single();

    return NextResponse.json({
      ok: true,
      alreadyCredited: false,
      koins: typedOffer.koins,
      koinsBalance: typeof newTotal === "number" ? newTotal : null,
      profile: (updatedProfile as Profile | null) ?? null,
    });
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
