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

/** Active chain for party escrow (Sepolia vs Mainnet). */
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

/** Stake token for party rooms — USDT on the configured chain. */
export const COMPETITIVE_TOKEN = isCeloSepoliaMode()
  ? CELO_SEPOLIA_USDT
  : CELO_MAINNET_USDT;

/** @deprecated Fixed entry removed — party uses variable contributions. */
export const ENTRY_FEE_USDT = "0.20";
/** @deprecated */
export const POOL_SHARE_USDT = "0.18";
/** @deprecated */
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

/** Party fee: 10% of pool contribution, capped at $10. */
export const PARTY_FEE_BPS = 1000;
export const PARTY_FEE_CAP_USDT = "10.00";
export const PARTY_MIN_POOL_USDT = "0.01";

export const PARTY_FEE_CAP_RAW = parseUnits(
  PARTY_FEE_CAP_USDT,
  COMPETITIVE_TOKEN.decimals,
);
export const PARTY_MIN_POOL_RAW = parseUnits(
  PARTY_MIN_POOL_USDT,
  COMPETITIVE_TOKEN.decimals,
);

export function calcPartyFeeRaw(poolAmountRaw: bigint): bigint {
  const fee = (poolAmountRaw * BigInt(PARTY_FEE_BPS)) / BigInt(10_000);
  return fee > PARTY_FEE_CAP_RAW ? PARTY_FEE_CAP_RAW : fee;
}

export function calcPartyTotalRaw(poolAmountRaw: bigint): bigint {
  return poolAmountRaw + calcPartyFeeRaw(poolAmountRaw);
}

export type PotStatus =
  | "none"
  | "open"
  | "funded"
  | "locked"
  | "settled"
  | "refunded";

/** On-chain PartyEscrow RoomStatus. */
export const ROOM_STATUS_ONCHAIN = {
  None: 0,
  Open: 1,
  Locked: 2,
  Settled: 3,
  Refunded: 4,
  /** @deprecated alias for Open (old CompetitiveEscrow Funded) */
  Funded: 1,
} as const;

export const partyEscrowAbi = [
  {
    type: "function",
    name: "open",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roomKey", type: "bytes32" },
      { name: "poolAmount", type: "uint256" },
    ],
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
    name: "fullRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawContribution",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "kickRefund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roomKey", type: "bytes32" },
      { name: "player", type: "address" },
    ],
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
    name: "quoteFee",
    stateMutability: "pure",
    inputs: [{ name: "poolAmount", type: "uint256" }],
    outputs: [
      { name: "fee", type: "uint256" },
      { name: "total", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "poolContributed",
    stateMutability: "view",
    inputs: [
      { name: "roomKey", type: "bytes32" },
      { name: "player", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "feeContributed",
    stateMutability: "view",
    inputs: [
      { name: "roomKey", type: "bytes32" },
      { name: "player", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "rooms",
    stateMutability: "view",
    inputs: [{ name: "roomKey", type: "bytes32" }],
    outputs: [
      { name: "host", type: "address" },
      { name: "status", type: "uint8" },
      { name: "poolTotal", type: "uint256" },
      { name: "commissionTotal", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Opened",
    inputs: [
      { name: "roomKey", type: "bytes32", indexed: true },
      { name: "host", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Contributed",
    inputs: [
      { name: "roomKey", type: "bytes32", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "poolAmount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "totalPaid", type: "uint256", indexed: false },
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
    name: "KickRefunded",
    inputs: [
      { name: "roomKey", type: "bytes32", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "poolAmount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "total", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "roomKey", type: "bytes32", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "poolAmount", type: "uint256", indexed: false },
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

/** @deprecated Use partyEscrowAbi */
export const competitiveEscrowAbi = partyEscrowAbi;

export function getEscrowAddress(): Address {
  const address = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not configured");
  }
  return address as Address;
}

/** True when pot can still accept contributions / pool-only refund. */
export function isPotOpenStatus(status: PotStatus | string | null | undefined): boolean {
  return status === "open" || status === "funded";
}
