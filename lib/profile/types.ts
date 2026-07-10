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

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);

  if (username.length < 3 || username.length > 20) {
    return "Username must be 3–20 characters.";
  }

  if (/\s/.test(username)) {
    return "Username cannot contain spaces.";
  }

  if (!USERNAME_RE.test(username)) {
    return "Username cannot contain special characters. Use only letters, numbers, and underscore.";
  }

  return null;
}

export function normalizeWalletAddress(address: string): string {
  return address.trim().toLowerCase();
}
