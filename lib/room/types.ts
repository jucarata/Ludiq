import type { PlayerColor } from "@/lib/board/types";
import type { RoomMode } from "@/lib/room/mode";

export type RoomPlayerView = {
  id: string;
  color: PlayerColor;
  username: string;
  isHost: boolean;
  isSelf: boolean;
  isGuest: boolean;
  autoEnabled: boolean;
};

export type RoomView = {
  id: string;
  code: string;
  mode: RoomMode;
  status: "waiting" | "playing" | "finished";
  hostId: string | null;
  players: RoomPlayerView[];
};
