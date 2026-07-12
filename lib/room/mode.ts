export type RoomMode = "free" | "competitive";

export const DEFAULT_ROOM_MODE: RoomMode = "free";

export function parseRoomMode(value: unknown): RoomMode {
  return value === "competitive" ? "competitive" : "free";
}

export function roomModeQuery(mode: RoomMode): string {
  return `mode=${mode}`;
}
