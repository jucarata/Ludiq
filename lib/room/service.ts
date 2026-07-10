import type { PlayerColor } from "@/lib/board/types";
import { generateRoomCode } from "@/lib/room/code";
import { firstAvailableColor } from "@/lib/room/colors";
import type { RoomPlayerView, RoomView } from "@/lib/room/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type RoomRow = Database["public"]["Tables"]["game_rooms"]["Row"];
type PlayerRow = Database["public"]["Tables"]["game_room_players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["game_room_players"]["Insert"];

type PlayerWithUsername = PlayerRow & {
  username: string;
};

export type RoomIdentity =
  | { kind: "profile"; profileId: string; username: string }
  | { kind: "guest"; guestSessionId: string; guestName: string };

async function allocateUniqueRoomCode(): Promise<string> {
  const supabase = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateRoomCode();
    const { data } = await supabase
      .from("game_rooms")
      .select("id")
      .eq("code", code)
      .in("status", ["waiting", "playing"])
      .maybeSingle();

    if (!data) return code;
  }

  throw new Error("Could not allocate a unique room code");
}

/** Active room with this code, if any (only one allowed at a time). */
async function findActiveRoomByCode(code: string): Promise<RoomRow | null> {
  const supabase = getSupabaseAdminClient();
  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .in("status", ["waiting", "playing"])
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Prefer the active room for a code; otherwise the most recently finished one
 * (so lobby realtime can detect close when status becomes finished).
 */
async function findRoomRowByCode(code: string): Promise<RoomRow | null> {
  const active = await findActiveRoomByCode(code);
  if (active) return active;

  const supabase = getSupabaseAdminClient();
  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

function isSelfPlayer(
  player: PlayerRow,
  identity: RoomIdentity | null,
): boolean {
  if (!identity) return false;
  if (identity.kind === "profile") {
    return player.user_id === identity.profileId;
  }
  return player.guest_session_id === identity.guestSessionId;
}

export function toRoomView(
  room: RoomRow,
  players: PlayerWithUsername[],
  identity: RoomIdentity | null,
): RoomView {
  const ordered = [...players].sort(
    (a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );

  const playerViews: RoomPlayerView[] = ordered.map((player) => ({
    id: player.id,
    color: player.color,
    username: player.username,
    isHost:
      room.host_id != null
        ? player.user_id === room.host_id
        : isSelfPlayer(player, identity) && ordered[0]?.id === player.id,
    isSelf: isSelfPlayer(player, identity),
    isGuest: player.user_id == null,
  }));

  return {
    id: room.id,
    code: room.code,
    status: room.status,
    hostId: room.host_id,
    players: playerViews,
  };
}

async function fetchRoomPlayers(
  roomId: string,
): Promise<PlayerWithUsername[]> {
  const supabase = getSupabaseAdminClient();
  const { data: players, error } = await supabase
    .from("game_room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = players ?? [];
  const userIds = [
    ...new Set(
      rows
        .map((player) => player.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const usernameByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);

    if (profileError) throw new Error(profileError.message);

    for (const profile of profiles ?? []) {
      usernameByUserId.set(
        profile.id,
        profile.username ?? profile.display_name ?? "PLAYER",
      );
    }
  }

  return rows.map((player) => ({
    ...player,
    username:
      player.guest_name ??
      (player.user_id ? usernameByUserId.get(player.user_id) : null) ??
      "PLAYER",
  }));
}

export async function getRoomByCode(
  code: string,
  identity: RoomIdentity | null,
): Promise<RoomView | null> {
  const room = await findRoomRowByCode(code);
  if (!room) return null;

  const players = await fetchRoomPlayers(room.id);
  return toRoomView(room, players, identity);
}

export async function createRoomWithHost(
  identity: RoomIdentity,
): Promise<RoomView> {
  const supabase = getSupabaseAdminClient();
  const code = await allocateUniqueRoomCode();
  const color = firstAvailableColor([]) ?? "red";

  const hostId = identity.kind === "profile" ? identity.profileId : null;

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .insert({
      code,
      host_id: hostId,
      status: "waiting",
    })
    .select("*")
    .single();

  if (roomError || !room) {
    throw new Error(roomError?.message ?? "Failed to create room");
  }

  const playerInsert: PlayerInsert =
    identity.kind === "profile"
      ? {
          room_id: room.id,
          user_id: identity.profileId,
          color,
          is_ready: false,
          is_bot: false,
        }
      : {
          room_id: room.id,
          user_id: null,
          guest_name: identity.guestName,
          guest_session_id: identity.guestSessionId,
          color,
          is_ready: false,
          is_bot: false,
        };

  const { error: playerError } = await supabase
    .from("game_room_players")
    .insert(playerInsert);

  if (playerError) {
    await supabase.from("game_rooms").delete().eq("id", room.id);
    throw new Error(playerError.message);
  }

  const players = await fetchRoomPlayers(room.id);
  return toRoomView(room, players, identity);
}

export async function joinRoom(params: {
  code: string;
  identity: RoomIdentity;
}): Promise<RoomView> {
  const supabase = getSupabaseAdminClient();
  const normalized = params.code.trim().toUpperCase();

  const { data: roomRow, error: roomError } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .eq("status", "waiting")
    .maybeSingle();

  if (roomError) throw new Error(roomError.message);
  if (!roomRow) {
    const active = await findActiveRoomByCode(normalized);
    if (active) {
      throw new Response(JSON.stringify({ error: "Room is not waiting" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const players = await fetchRoomPlayers(roomRow.id);
  const alreadyIn = players.find((player) =>
    isSelfPlayer(player, params.identity),
  );
  if (alreadyIn) {
    return toRoomView(roomRow, players, params.identity);
  }

  if (players.length >= roomRow.max_players) {
    throw new Response(JSON.stringify({ error: "Room is full" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const color = firstAvailableColor(players.map((player) => player.color));
  if (!color) {
    throw new Response(JSON.stringify({ error: "Room is full" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const playerInsert: PlayerInsert =
    params.identity.kind === "profile"
      ? {
          room_id: roomRow.id,
          user_id: params.identity.profileId,
          color,
          is_ready: false,
          is_bot: false,
        }
      : {
          room_id: roomRow.id,
          user_id: null,
          guest_name: params.identity.guestName,
          guest_session_id: params.identity.guestSessionId,
          color,
          is_ready: false,
          is_bot: false,
        };

  const { error: playerError } = await supabase
    .from("game_room_players")
    .insert(playerInsert);

  if (playerError) {
    if (playerError.code === "23505") {
      const refreshed = await fetchRoomPlayers(roomRow.id);
      const self = refreshed.find((player) =>
        isSelfPlayer(player, params.identity),
      );
      if (self) return toRoomView(roomRow, refreshed, params.identity);

      throw new Response(JSON.stringify({ error: "Color already taken" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(playerError.message);
  }

  const updatedPlayers = await fetchRoomPlayers(roomRow.id);
  return toRoomView(roomRow, updatedPlayers, params.identity);
}

function isRoomHost(
  room: RoomRow,
  players: PlayerRow[],
  identity: RoomIdentity,
): boolean {
  if (room.host_id != null) {
    return (
      identity.kind === "profile" && identity.profileId === room.host_id
    );
  }

  const ordered = [...players].sort(
    (a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );
  const first = ordered[0];
  return first != null && isSelfPlayer(first, identity);
}

export async function closeRoom(params: {
  code: string;
  identity: RoomIdentity;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code);

  if (!roomRow) {
    const finished = await findRoomRowByCode(params.code);
    if (finished?.status === "finished") return;
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const players = await fetchRoomPlayers(roomRow.id);
  if (!isRoomHost(roomRow, players, params.identity)) {
    throw new Response(JSON.stringify({ error: "Only the host can close the room" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: updateError } = await supabase
    .from("game_rooms")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
    })
    .eq("id", roomRow.id);

  if (updateError) throw new Error(updateError.message);
}

/** Leave the lobby. Host leave closes the room for everyone. */
export async function leaveRoom(params: {
  code: string;
  identity: RoomIdentity;
}): Promise<{ closed: boolean }> {
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code);

  if (!roomRow) {
    const finished = await findRoomRowByCode(params.code);
    if (finished?.status === "finished") return { closed: true };
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const players = await fetchRoomPlayers(roomRow.id);
  const self = players.find((player) =>
    isSelfPlayer(player, params.identity),
  );

  if (!self) {
    return { closed: roomRow.status !== "waiting" };
  }

  if (isRoomHost(roomRow, players, params.identity)) {
    await closeRoom(params);
    return { closed: true };
  }

  const { error: deleteError } = await supabase
    .from("game_room_players")
    .delete()
    .eq("id", self.id);

  if (deleteError) throw new Error(deleteError.message);
  return { closed: false };
}

export async function changePlayerColor(params: {
  code: string;
  color: PlayerColor;
  identity: RoomIdentity;
}): Promise<RoomView> {
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code);
  if (!roomRow || roomRow.status !== "waiting") {
    throw new Response(
      JSON.stringify({
        error: roomRow ? "Room is not waiting" : "Room not found",
      }),
      {
        status: roomRow ? 409 : 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const players = await fetchRoomPlayers(roomRow.id);
  const self = players.find((player) =>
    isSelfPlayer(player, params.identity),
  );

  if (!self) {
    throw new Response(JSON.stringify({ error: "You are not in this room" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (self.color === params.color) {
    return toRoomView(roomRow, players, params.identity);
  }

  const takenByOther = players.some(
    (player) => player.id !== self.id && player.color === params.color,
  );
  if (takenByOther) {
    throw new Response(JSON.stringify({ error: "Color already taken" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: updateError } = await supabase
    .from("game_room_players")
    .update({ color: params.color })
    .eq("id", self.id);

  if (updateError) {
    if (updateError.code === "23505") {
      throw new Response(JSON.stringify({ error: "Color already taken" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(updateError.message);
  }

  const updatedPlayers = await fetchRoomPlayers(roomRow.id);
  return toRoomView(roomRow, updatedPlayers, params.identity);
}

export async function resolveRoomIdentity(params: {
  privyUserId: string | null;
  guestSessionId?: string | null;
  guestName?: string | null;
}): Promise<RoomIdentity | null> {
  if (params.privyUserId) {
    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("privy_user_id", params.privyUserId)
      .maybeSingle();

    if (profile?.username) {
      return {
        kind: "profile",
        profileId: profile.id,
        username: profile.username,
      };
    }
  }

  const guestSessionId = params.guestSessionId?.trim();
  if (!guestSessionId) return null;

  const guestName = (params.guestName ?? "").trim().toUpperCase();
  if (!/^USER\d{5}$/.test(guestName) && !/^[A-Z0-9_]{3,20}$/.test(guestName)) {
    return null;
  }

  return {
    kind: "guest",
    guestSessionId,
    guestName,
  };
}
