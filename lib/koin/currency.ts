/**
 * Soft currency used across Ludiq (entry fees, cosmetics, etc.).
 * Real-money purchase (USDT → Koin) is planned but not wired yet.
 */
export const KOIN = {
  id: "koin",
  /** Singular display name. */
  name: "Koin",
  /** Plural display name. */
  namePlural: "Koins",
  /** Short ticker-style label for UI chips. */
  ticker: "KOIN",
} as const;

export type KoinCurrency = typeof KOIN;

/** Format a Koin balance for display (no decimals — whole units only). */
export function formatKoins(amount: number, locale?: string): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return safe.toLocaleString(locale ?? undefined);
}
