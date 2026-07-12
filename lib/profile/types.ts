import type { MessageKey } from "@/lib/i18n";
import { en } from "@/lib/i18n/messages/en";

export type Profile = {
  id: string;
  privy_user_id: string;
  wallet_address: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  games_played: number;
  games_won: number;
  created_at: string;
  updated_at: string;
};

export type UsernameValidationKey =
  | "validation.usernameLength"
  | "validation.usernameSpaces"
  | "validation.usernameChars";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const VALIDATION_EN: Record<UsernameValidationKey, string> = {
  "validation.usernameLength": en.validation.usernameLength,
  "validation.usernameSpaces": en.validation.usernameSpaces,
  "validation.usernameChars": en.validation.usernameChars,
};

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function validateUsername(raw: string): UsernameValidationKey | null {
  const username = normalizeUsername(raw);

  if (username.length < 3 || username.length > 20) {
    return "validation.usernameLength";
  }

  if (/\s/.test(username)) {
    return "validation.usernameSpaces";
  }

  if (!USERNAME_RE.test(username)) {
    return "validation.usernameChars";
  }

  return null;
}

/** English message for API responses (client maps back to i18n keys). */
export function usernameValidationMessage(
  key: UsernameValidationKey,
): string {
  return VALIDATION_EN[key];
}

/** Map known English API error strings to translation keys. */
export function mapApiErrorToMessageKey(
  error: string | undefined,
): MessageKey | null {
  switch (error) {
    case "Missing auth token":
      return "api.missingAuthToken";
    case "Invalid auth token":
      return "api.invalidAuthToken";
    case "A valid wallet address is required":
      return "api.validWalletRequired";
    case "Username is required":
      return "api.usernameRequired";
    case "That username is already taken":
      return "api.usernameTaken";
    case "That wallet is already linked to another profile":
      return "api.walletTaken";
    case "Unexpected error":
      return "api.unexpectedError";
    case en.validation.usernameLength:
      return "validation.usernameLength";
    case en.validation.usernameSpaces:
      return "validation.usernameSpaces";
    case en.validation.usernameChars:
      return "validation.usernameChars";
    default:
      return null;
  }
}

export function normalizeWalletAddress(address: string): string {
  return address.trim().toLowerCase();
}
