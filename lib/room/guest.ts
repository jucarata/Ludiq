import type { RoomMode } from "@/lib/room/mode";
import { DEFAULT_ROOM_MODE } from "@/lib/room/mode";

const GUEST_SESSION_KEY = "ludiq_guest_session_id";
const GUEST_NAME_KEY = "ludiq_guest_name";
const HOST_ROOM_KEY = "ludiq_host_room_code";

function hostRoomStorageKey(mode: RoomMode = DEFAULT_ROOM_MODE): string {
  return `${HOST_ROOM_KEY}:${mode}`;
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

export function getStoredHostRoomCode(
  mode: RoomMode = DEFAULT_ROOM_MODE,
): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(hostRoomStorageKey(mode));
}

export function setStoredHostRoomCode(
  code: string,
  mode: RoomMode = DEFAULT_ROOM_MODE,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(hostRoomStorageKey(mode), code);
}

export function clearStoredHostRoomCode(
  mode: RoomMode = DEFAULT_ROOM_MODE,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(hostRoomStorageKey(mode));
}
