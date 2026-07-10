import type { PlayerColor } from "@/lib/board/types";

export type RoomPlayerView = {
  id: string;
  color: PlayerColor;
  username: string;
  isHost: boolean;
  isSelf: boolean;
  isGuest: boolean;
};

export type RoomView = {
  id: string;
  code: string;
  status: "waiting" | "playing" | "finished";
  hostId: string | null;
  players: RoomPlayerView[];
};
