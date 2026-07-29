import { keccak256, parseUnits, stringToBytes, type Hex } from "viem";
import { COMPETITIVE_TOKEN } from "@/lib/celo/constants";

export type ShopOffer = {
  id: string;
  slug: string;
  koins: number;
  price_usdt: number;
  sort_order: number;
  active: boolean;
  created_at: string;
};

/** On-chain offerId = keccak256(utf8 slug). Stable across redeploys. */
export function shopOfferIdFromSlug(slug: string): Hex {
  return keccak256(stringToBytes(slug));
}

export function shopOfferPriceRaw(priceUsdt: number | string): bigint {
  const normalized =
    typeof priceUsdt === "number"
      ? priceUsdt.toFixed(COMPETITIVE_TOKEN.decimals)
      : String(priceUsdt);
  return parseUnits(normalized, COMPETITIVE_TOKEN.decimals);
}

export function formatShopPriceUsdt(priceUsdt: number | string): string {
  const n = typeof priceUsdt === "number" ? priceUsdt : Number(priceUsdt);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}
