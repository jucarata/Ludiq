import type { PlayerColor } from "@/lib/board/types";
import type { RoomView } from "@/lib/room/types";

/** Instant local color swap for the current player (before the API confirms). */
export function withOptimisticColor(
  room: RoomView,
  color: PlayerColor,
): RoomView {
  return {
    ...room,
    players: room.players.map((player) =>
      player.isSelf ? { ...player, color } : player,
    ),
  };
}
