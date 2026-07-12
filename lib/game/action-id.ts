/** Client/server shared action id for live + DB dedupe. */

const ACTION_ID_MAX = 64;
const ACTION_ID_RE = /^[A-Za-z0-9_-]+$/;

export function createActionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isValidActionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= ACTION_ID_MAX &&
    ACTION_ID_RE.test(value)
  );
}
