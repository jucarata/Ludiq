import type { RoomMode } from "@/lib/room/mode";
import { DEFAULT_ROOM_MODE, parseRoomMode } from "@/lib/room/mode";

const GUEST_SESSION_KEY = "ludiq_guest_session_id";
const GUEST_NAME_KEY = "ludiq_guest_name";
/** Single host-room pointer (survives reload; not keyed by mode). */
const HOST_ROOM_KEY = "partyk_host_room";
/** @deprecated per-mode session keys — still cleared on migrate */
const LEGACY_HOST_ROOM_KEY = "ludiq_host_room_code";

export type StoredHostRoom = {
  code: string;
  mode: RoomMode;
};

function legacyHostRoomStorageKey(mode: RoomMode): string {
  return `${LEGACY_HOST_ROOM_KEY}:${mode}`;
}

/** Guest display name like USER72873 (5 digits). */
export function generateGuestUsername(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 100_000;
  return `USER${String(n).padStart(5, "0")}`;
}

export function getOrCreateGuestSessionId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  const existing = window.localStorage.getItem(GUEST_SESSION_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(GUEST_SESSION_KEY, id);
  return id;
}

export function getOrCreateGuestUsername(): string {
  if (typeof window === "undefined") {
    return generateGuestUsername();
  }

  const existing = window.localStorage.getItem(GUEST_NAME_KEY);
  if (existing) return existing;

  const name = generateGuestUsername();
  window.localStorage.setItem(GUEST_NAME_KEY, name);
  return name;
}

export function getGuestIdentity() {
  return {
    guestSessionId: getOrCreateGuestSessionId(),
    guestName: getOrCreateGuestUsername(),
  };
}

function readLegacyHostRoom(): StoredHostRoom | null {
  if (typeof window === "undefined") return null;

  for (const mode of ["party", "free"] as const) {
    const code = window.sessionStorage.getItem(legacyHostRoomStorageKey(mode));
    if (code) {
      return { code, mode };
    }
  }

  const bare = window.sessionStorage.getItem(LEGACY_HOST_ROOM_KEY);
  if (bare) return { code: bare, mode: DEFAULT_ROOM_MODE };
  return null;
}

function clearLegacyHostRoomKeys(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LEGACY_HOST_ROOM_KEY);
  window.sessionStorage.removeItem(legacyHostRoomStorageKey("free"));
  window.sessionStorage.removeItem(legacyHostRoomStorageKey("party"));
}

/** Active host lobby to restore after reload (any mode). */
export function getStoredHostRoom(): StoredHostRoom | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(HOST_ROOM_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { code?: string; mode?: string };
      if (parsed.code && typeof parsed.code === "string") {
        return {
          code: parsed.code.trim().toUpperCase(),
          mode: parseRoomMode(parsed.mode),
        };
      }
    } catch {
      // fall through to legacy
    }
  }

  const legacy = readLegacyHostRoom();
  if (legacy) {
    setStoredHostRoom(legacy.code, legacy.mode);
    clearLegacyHostRoomKeys();
    return legacy;
  }

  return null;
}

export function setStoredHostRoom(code: string, mode: RoomMode): void {
  if (typeof window === "undefined") return;
  const payload: StoredHostRoom = {
    code: code.trim().toUpperCase(),
    mode,
  };
  window.localStorage.setItem(HOST_ROOM_KEY, JSON.stringify(payload));
  clearLegacyHostRoomKeys();
}

export function clearStoredHostRoom(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HOST_ROOM_KEY);
  clearLegacyHostRoomKeys();
}

/** @deprecated Use getStoredHostRoom — kept for gradual call-site updates. */
export function getStoredHostRoomCode(
  mode: RoomMode = DEFAULT_ROOM_MODE,
): string | null {
  const stored = getStoredHostRoom();
  if (!stored) return null;
  if (mode && stored.mode !== mode) {
    // Still return the code — caller should prefer getStoredHostRoom().
    return stored.code;
  }
  return stored.code;
}

/** @deprecated Use setStoredHostRoom */
export function setStoredHostRoomCode(
  code: string,
  mode: RoomMode = DEFAULT_ROOM_MODE,
): void {
  setStoredHostRoom(code, mode);
}

/** @deprecated Use clearStoredHostRoom */
export function clearStoredHostRoomCode(
  _mode: RoomMode = DEFAULT_ROOM_MODE,
): void {
  clearStoredHostRoom();
}
