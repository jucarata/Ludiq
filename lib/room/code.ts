const ROOM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_RE = /^[A-Z0-9]{4}$/;

/** Generates a 4-character alphanumeric room code (letters always uppercase). */
export function generateRoomCode(length = ROOM_CODE_LENGTH): string {
  const values = crypto.getRandomValues(new Uint8Array(length));
  let code = "";

  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[values[i]! % ROOM_CODE_ALPHABET.length]!;
  }

  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_RE.test(code);
}
