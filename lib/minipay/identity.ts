import { normalizeWalletAddress } from "@/lib/profile/types";

export const MINIPAY_USER_ID_PREFIX = "minipay:" as const;

export function minipayUserIdFromAddress(address: string): string {
  return `${MINIPAY_USER_ID_PREFIX}${normalizeWalletAddress(address)}`;
}

export function isMiniPayUserId(userId: string): boolean {
  return userId.startsWith(MINIPAY_USER_ID_PREFIX);
}
