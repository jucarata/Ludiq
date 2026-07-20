import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  commissionFromPaidPlayers,
  getWeeklyPrizeBreakdown,
  type PrizePlace,
} from "@/lib/leaderboard/prizes";
import { getUtcWeekRange } from "@/lib/leaderboard/week";

export type LeaderboardEntry = {
  rank: number;
  profileId: string;
  username: string;
  trophies: number;
  /** Estimated USDT prize if this rank holds through week end. */
  prizeUsdc: number;
};

export type LeaderboardMe = {
  registered: boolean;
  rank: number | null;
  profileId: string | null;
  username: string | null;
  trophies: number;
  /** Present when the user is currently 1st–3rd. */
  prizeUsdc: number | null;
};

export type WeeklyLeaderboard = {
  weekStart: string;
  weekEnd: string;
  /** Total commission from competitive matches finished this week. */
  weeklyCommissionUsdc: number;
  /** 40% of weekly commission reserved for leaderboard prizes. */
  prizePoolUsdc: number;
  /** Current estimated prize per podium place (USDT). */
  prizesByPlace: Record<"1" | "2" | "3", number>;
  top: LeaderboardEntry[];
  me: LeaderboardMe | null;
};

type Standing = {
  profileId: string;
  username: string;
  trophies: number;
};

function assignRanks(standings: Standing[]): LeaderboardEntry[] {
  const sorted = [...standings].sort((a, b) => {
    if (b.trophies !== a.trophies) return b.trophies - a.trophies;
    return a.username.localeCompare(b.username, "en", { sensitivity: "base" });
  });

  let lastTrophies: number | null = null;
  let lastRank = 0;

  return sorted.map((row, index) => {
    if (lastTrophies === null || row.trophies !== lastTrophies) {
      lastRank = index + 1;
      lastTrophies = row.trophies;
    }
    return {
      rank: lastRank,
      profileId: row.profileId,
      username: row.username,
      trophies: row.trophies,
      prizeUsdc: 0,
    };
  });
}

async function loadWeeklyCommissionUsdc(
  weekStart: Date,
  weekEnd: Date,
): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { data: rooms, error: roomsError } = await supabase
    .from("game_rooms")
    .select("id")
    .eq("mode", "competitive")
    .eq("status", "finished")
    .gte("finished_at", weekStart.toISOString())
    .lt("finished_at", weekEnd.toISOString());

  if (roomsError) throw new Error(roomsError.message);
  if (!rooms?.length) return 0;

  const roomIds = rooms.map((room) => room.id);
  const { data: players, error: playersError } = await supabase
    .from("game_room_players")
    .select("room_id, entry_paid")
    .in("room_id", roomIds)
    .eq("entry_paid", true);

  if (playersError) throw new Error(playersError.message);

  const paidByRoom = new Map<string, number>();
  for (const player of players ?? []) {
    paidByRoom.set(player.room_id, (paidByRoom.get(player.room_id) ?? 0) + 1);
  }

  let total = 0;
  for (const count of paidByRoom.values()) {
    total += commissionFromPaidPlayers(count);
  }
  return total;
}

function attachPrizes(
  ranked: LeaderboardEntry[],
  weeklyCommissionUsdc: number,
): LeaderboardEntry[] {
  const { byPlace } = getWeeklyPrizeBreakdown(weeklyCommissionUsdc);

  return ranked.map((entry) => {
    const place = entry.rank as PrizePlace;
    const prizeUsdc =
      place === 1 || place === 2 || place === 3 ? byPlace[place] : 0;
    return { ...entry, prizeUsdc };
  });
}

async function loadWeeklyStandings(
  weekStart: Date,
  weekEnd: Date,
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseAdminClient();

  const { data: rooms, error: roomsError } = await supabase
    .from("game_rooms")
    .select("id, winner, trophies_awarded")
    .eq("mode", "competitive")
    .not("trophies_awarded", "is", null)
    .not("winner", "is", null)
    .gte("finished_at", weekStart.toISOString())
    .lt("finished_at", weekEnd.toISOString());

  if (roomsError) throw new Error(roomsError.message);
  if (!rooms?.length) return [];

  const roomIds = rooms.map((room) => room.id);
  const { data: players, error: playersError } = await supabase
    .from("game_room_players")
    .select("room_id, user_id, color")
    .in("room_id", roomIds)
    .not("user_id", "is", null);

  if (playersError) throw new Error(playersError.message);

  const playersByRoom = new Map<
    string,
    { user_id: string; color: string }[]
  >();
  for (const player of players ?? []) {
    if (!player.user_id) continue;
    const list = playersByRoom.get(player.room_id) ?? [];
    list.push({ user_id: player.user_id, color: player.color });
    playersByRoom.set(player.room_id, list);
  }

  const trophiesByProfile = new Map<string, number>();

  for (const room of rooms) {
    const awarded = room.trophies_awarded;
    if (!room.winner || typeof awarded !== "number" || awarded <= 0) continue;

    const winnerPlayer = (playersByRoom.get(room.id) ?? []).find(
      (p) => p.color === room.winner,
    );
    if (!winnerPlayer) continue;

    trophiesByProfile.set(
      winnerPlayer.user_id,
      (trophiesByProfile.get(winnerPlayer.user_id) ?? 0) + awarded,
    );
  }

  if (trophiesByProfile.size === 0) return [];

  const profileIds = [...trophiesByProfile.keys()];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", profileIds);

  if (profilesError) throw new Error(profilesError.message);

  const standings: Standing[] = [];
  for (const profile of profiles ?? []) {
    if (!profile.username) continue;
    const trophies = trophiesByProfile.get(profile.id) ?? 0;
    if (trophies <= 0) continue;
    standings.push({
      profileId: profile.id,
      username: profile.username,
      trophies,
    });
  }

  return assignRanks(standings);
}

export async function getWeeklyLeaderboard(params: {
  privyUserId?: string | null;
}): Promise<WeeklyLeaderboard> {
  const { start, end } = getUtcWeekRange();
  const [ranked, weeklyCommissionUsdc] = await Promise.all([
    loadWeeklyStandings(start, end),
    loadWeeklyCommissionUsdc(start, end),
  ]);
  const { prizePoolUsdc, byPlace } = getWeeklyPrizeBreakdown(weeklyCommissionUsdc);
  const rankedWithPrizes = attachPrizes(ranked, weeklyCommissionUsdc);
  const top = rankedWithPrizes.slice(0, 3);

  let me: LeaderboardMe | null = null;

  if (params.privyUserId) {
    const supabase = getSupabaseAdminClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("privy_user_id", params.privyUserId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!profile?.username) {
      me = {
        registered: false,
        rank: null,
        profileId: null,
        username: null,
        trophies: 0,
        prizeUsdc: null,
      };
    } else {
      const mine = rankedWithPrizes.find(
        (entry) => entry.profileId === profile.id,
      );
      const rank = mine?.rank ?? null;
      me = {
        registered: true,
        rank,
        profileId: profile.id,
        username: profile.username,
        trophies: mine?.trophies ?? 0,
        prizeUsdc:
          rank === 1 || rank === 2 || rank === 3
            ? (mine?.prizeUsdc ?? 0)
            : null,
      };
    }
  }

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    weeklyCommissionUsdc,
    prizePoolUsdc,
    prizesByPlace: {
      "1": byPlace[1],
      "2": byPlace[2],
      "3": byPlace[3],
    },
    top,
    me,
  };
}
