import { parseUnits, type Address } from "viem";
import { celo, celoSepolia, type Chain } from "viem/chains";

/** Celo Sepolia USDC (6 decimals) — Circle testnet token (legacy reference). */
export const CELO_SEPOLIA_USDC = {
  address: "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as Address,
  symbol: "USDC",
  decimals: 6,
} as const;

/** Celo Mainnet USDC (6 decimals) — Circle (legacy reference). */
export const CELO_MAINNET_USDC = {
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as Address,
  symbol: "USDC",
  decimals: 6,
} as const;

/** Celo Sepolia USDT (6 decimals). */
export const CELO_SEPOLIA_USDT = {
  address: "0xd077A400968890Eacc75cdc901F0356c943e4fDb" as Address,
  symbol: "USDT",
  decimals: 6,
} as const;

/** Celo Mainnet USDT (6 decimals) — Tether. */
export const CELO_MAINNET_USDT = {
  address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as Address,
  symbol: "USDT",
  decimals: 6,
} as const;

export function isCeloSepoliaMode(): boolean {
  const chain = process.env.NEXT_PUBLIC_CELO_CHAIN?.toLowerCase();
  return (
    chain === "sepolia" || chain === "celo-sepolia" || chain === "celosepolia"
  );
}

/** Active chain for competitive escrow (Sepolia vs Mainnet). */
export function getCompetitiveChain(): Chain {
  return isCeloSepoliaMode() ? celoSepolia : celo;
}

export function getCompetitiveRpcUrl(): string {
  if (isCeloSepoliaMode()) {
    return (
      process.env.CELO_SEPOLIA_RPC_URL ??
      process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC_URL ??
      "https://forno.celo-sepolia.celo-testnet.org"
    );
  }
  return (
    process.env.CELO_RPC_URL ??
    process.env.NEXT_PUBLIC_CELO_RPC_URL ??
    "https://forno.celo.org"
  );
}

/** Stake token for competitive rooms — USDT on the configured chain. */
export const COMPETITIVE_TOKEN = isCeloSepoliaMode()
  ? CELO_SEPOLIA_USDT
  : CELO_MAINNET_USDT;

export const ENTRY_FEE_USDT = "0.20";
/** Pool contribution per paying player (90% of entry). */
export const POOL_SHARE_USDT = "0.18";
/** Commission per paying player (10% of entry), held in escrow until withdraw. */
export const COMMISSION_SHARE_USDT = "0.02";

export const ENTRY_FEE_RAW = parseUnits(
  ENTRY_FEE_USDT,
  COMPETITIVE_TOKEN.decimals,
);
export const POOL_SHARE_RAW = parseUnits(
  POOL_SHARE_USDT,
  COMPETITIVE_TOKEN.decimals,
);
export const COMMISSION_SHARE_RAW = parseUnits(
  COMMISSION_SHARE_USDT,
  COMPETITIVE_TOKEN.decimals,
);

export type PotStatus =
  | "none"
  | "funded"
  | "locked"
  | "settled"
  | "refunded";

export const ROOM_STATUS_ONCHAIN = {
  None: 0,
  Funded: 1,
  Locked: 2,
  Settled: 3,
  Refunded: 4,
} as const;

export const competitiveEscrowAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "joinDeposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "lock",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roomKey", type: "bytes32" },
      { name: "winner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawCommission",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "hasPaid",
    stateMutability: "view",
    inputs: [
      { name: "roomKey", type: "bytes32" },
      { name: "player", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "rooms",
    stateMutability: "view",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [
      { name: "host", type: "address" },
      { name: "status", type: "uint8" },
      { name: "playerCount", type: "uint8" },
      { name: "poolTotal", type: "uint256" },
      { name: "commissionTotal", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "ENTRY_FEE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "roomKey", type: "bytes32", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [
      { name: "roomKey", type: "bytes32", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Locked",
    inputs: [{ name: "roomKey", type: "bytes32", indexed: true }],
  },
  {
    type: "event",
    name: "Settled",
    inputs: [
      { name: "roomKey", type: "bytes32", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "poolAmount", type: "uint256", indexed: false },
      { name: "commissionAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

export function getEscrowAddress(): Address {
  const address = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not configured");
  }
  return address as Address;
}
