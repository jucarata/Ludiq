import type { PlayerColor } from "@/lib/board/types";
import type { PotStatus } from "@/lib/celo/constants";
import type { RoomMode } from "@/lib/room/mode";

export type RoomPlayerView = {
  id: string;
  color: PlayerColor;
  username: string;
  isHost: boolean;
  isSelf: boolean;
  isGuest: boolean;
  autoEnabled: boolean;
  /** Legacy flag; party uses contributedPoolUsdt instead. */
  entryPaid: boolean;
  contributedPoolUsdt: number;
  /** Profile wallet (party kick/leave refunds). Null for guests. */
  walletAddress: string | null;
};

export type RoomView = {
  id: string;
  code: string;
  mode: RoomMode;
  status: "waiting" | "playing" | "finished";
  hostId: string | null;
  players: RoomPlayerView[];
  potAmountUsdt: number;
  potStatus: PotStatus;
  escrowRoomKey: string | null;
  /** Future 1vs1: trophies granted to the winner. Always null for free/party. */
  trophiesAwarded: number | null;
};
