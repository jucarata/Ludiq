import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ShopOffer } from "@/lib/shop/offers";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("shop_offers")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      offers: (data as ShopOffer[] | null) ?? [],
    });
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
