import { COMMISSION_SHARE_USDT } from "@/lib/celo/constants";

/** Share of weekly commission reserved for the trophy leaderboard. */
export const LEADERBOARD_COMMISSION_SHARE = 0.4;

/** Split of the leaderboard pool among 1st / 2nd / 3rd. */
export const PRIZE_SHARE_BY_PLACE = {
  1: 0.5,
  2: 0.3,
  3: 0.2,
} as const;

export type PrizePlace = keyof typeof PRIZE_SHARE_BY_PLACE;

const COMMISSION_PER_PLAYER = Number(COMMISSION_SHARE_USDT);

export function getLeaderboardPrizePoolUsdc(weeklyCommissionUsdc: number): number {
  return weeklyCommissionUsdc * LEADERBOARD_COMMISSION_SHARE;
}

export function getPrizeUsdcForPlace(
  weeklyCommissionUsdc: number,
  place: PrizePlace,
): number {
  const pool = getLeaderboardPrizePoolUsdc(weeklyCommissionUsdc);
  return pool * PRIZE_SHARE_BY_PLACE[place];
}

export function getWeeklyPrizeBreakdown(weeklyCommissionUsdc: number): {
  weeklyCommissionUsdc: number;
  prizePoolUsdc: number;
  byPlace: Record<PrizePlace, number>;
} {
  const prizePoolUsdc = getLeaderboardPrizePoolUsdc(weeklyCommissionUsdc);
  return {
    weeklyCommissionUsdc,
    prizePoolUsdc,
    byPlace: {
      1: prizePoolUsdc * PRIZE_SHARE_BY_PLACE[1],
      2: prizePoolUsdc * PRIZE_SHARE_BY_PLACE[2],
      3: prizePoolUsdc * PRIZE_SHARE_BY_PLACE[3],
    },
  };
}

/** Commission accrued from N paying players in one competitive match. */
export function commissionFromPaidPlayers(paidPlayerCount: number): number {
  if (paidPlayerCount <= 0) return 0;
  return COMMISSION_PER_PLAYER * paidPlayerCount;
}
