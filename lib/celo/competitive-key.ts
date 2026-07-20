import type { Hex } from "viem";

/** Random bytes32 room key for the escrow mapping. */
export function generateEscrowRoomKey(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}
