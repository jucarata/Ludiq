const GUEST_SESSION_KEY = "ludiq_guest_session_id";
const GUEST_NAME_KEY = "ludiq_guest_name";
const HOST_ROOM_KEY = "ludiq_host_room_code";

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

export function getStoredHostRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(HOST_ROOM_KEY);
}

export function setStoredHostRoomCode(code: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(HOST_ROOM_KEY, code);
}

export function clearStoredHostRoomCode(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(HOST_ROOM_KEY);
}
