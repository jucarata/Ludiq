export type RoomMode = "free" | "party";

export const DEFAULT_ROOM_MODE: RoomMode = "free";

export function parseRoomMode(value: unknown): RoomMode {
  if (value === "party" || value === "competitive") {
    // "competitive" accepted as alias for older clients / links
    return "party";
  }
  return "free";
}

export function roomModeQuery(mode: RoomMode): string {
  return `mode=${mode}`;
}

export function isPartyMode(mode: string | null | undefined): boolean {
  return mode === "party" || mode === "competitive";
}
