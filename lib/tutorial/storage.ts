const TUTORIAL_COMPLETED_KEY = "partyk.tutorial_completed";

export function readTutorialCompletedLocal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TUTORIAL_COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeTutorialCompletedLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_COMPLETED_KEY, "1");
  } catch {
    // Ignore quota / private mode failures — DB flag still applies when authed.
  }
}
