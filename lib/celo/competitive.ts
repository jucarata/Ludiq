import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatUnits,
  http,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia } from "viem/chains";
import {
  COMPETITIVE_TOKEN,
  ENTRY_FEE_RAW,
  ROOM_STATUS_ONCHAIN,
  competitiveEscrowAbi,
  getEscrowAddress,
} from "@/lib/celo/constants";

export {
  CELO_SEPOLIA_USDC,
  CELO_SEPOLIA_USDT,
  COMMISSION_SHARE_USDT,
  COMPETITIVE_TOKEN,
  ENTRY_FEE_RAW,
  ENTRY_FEE_USDT,
  POOL_SHARE_RAW,
  POOL_SHARE_USDT,
  ROOM_STATUS_ONCHAIN,
  competitiveEscrowAbi,
  getEscrowAddress,
  isCeloSepoliaMode,
} from "@/lib/celo/constants";
export type { PotStatus } from "@/lib/celo/constants";

export { erc20Abi } from "viem";

function rpcUrl(): string {
  return (
    process.env.CELO_SEPOLIA_RPC_URL ??
    process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC_URL ??
    "https://forno.celo-sepolia.celo-testnet.org"
  );
}

export function getCompetitivePublicClient() {
  return createPublicClient({
    chain: celoSepolia,
    transport: http(rpcUrl()),
  });
}

export function formatUsdtAmount(raw: bigint): string {
  const asNumber = Number(formatUnits(raw, COMPETITIVE_TOKEN.decimals));
  if (!Number.isFinite(asNumber)) {
    return formatUnits(raw, COMPETITIVE_TOKEN.decimals);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(asNumber);
}

export { generateEscrowRoomKey } from "@/lib/celo/competitive-key";

export function normalizeHex32(value: string): Hex {
  const trimmed = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(trimmed)) {
    throw new Error("Invalid escrow room key");
  }
  return trimmed as Hex;
}

export function normalizeTxHash(value: string): Hash {
  const trimmed = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(trimmed)) {
    throw new Error("Invalid transaction hash");
  }
  return trimmed as Hash;
}

function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export async function verifyDepositTransaction(params: {
  txHash: string;
  roomKey: string;
  expectedPlayer: string;
  /** When true, also require that expectedPlayer is the on-chain host. */
  requireHost?: boolean;
}): Promise<{ roomKey: Hex; player: Address; amount: bigint }> {
  const client = getCompetitivePublicClient();
  const escrow = getEscrowAddress();
  const txHash = normalizeTxHash(params.txHash);
  const roomKey = normalizeHex32(params.roomKey);

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Deposit transaction failed");
  }

  let deposited: { roomKey: Hex; player: Address; amount: bigint } | null =
    null;

  for (const log of receipt.logs) {
    if (!addressesEqual(log.address, escrow)) continue;
    try {
      const decoded = decodeEventLog({
        abi: competitiveEscrowAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Deposited") continue;
      const player = decoded.args.player as Address;
      if (!addressesEqual(player, params.expectedPlayer)) continue;
      deposited = {
        roomKey: decoded.args.roomKey as Hex,
        player,
        amount: decoded.args.amount as bigint,
      };
      break;
    } catch {
      // not our event
    }
  }

  if (!deposited) {
    throw new Error("Deposit event not found in transaction");
  }
  if (deposited.roomKey.toLowerCase() !== roomKey.toLowerCase()) {
    throw new Error("Deposit room key mismatch");
  }
  if (deposited.amount !== ENTRY_FEE_RAW) {
    throw new Error("Deposit amount mismatch");
  }

  const paid = await client.readContract({
    address: escrow,
    abi: competitiveEscrowAbi,
    functionName: "hasPaid",
    args: [roomKey, params.expectedPlayer as Address],
  });
  if (!paid) {
    throw new Error("Escrow does not record this player as paid");
  }

  const onchain = await client.readContract({
    address: escrow,
    abi: competitiveEscrowAbi,
    functionName: "rooms",
    args: [roomKey],
  });

  if (onchain[1] !== ROOM_STATUS_ONCHAIN.Funded) {
    throw new Error("Escrow room is not funded");
  }
  if (
    params.requireHost &&
    !addressesEqual(onchain[0], params.expectedPlayer)
  ) {
    throw new Error("Deposit host wallet mismatch");
  }

  return deposited;
}

export async function verifyRefundTransaction(params: {
  txHash: string;
  roomKey: string;
  expectedHost: string;
}): Promise<void> {
  const client = getCompetitivePublicClient();
  const escrow = getEscrowAddress();
  const txHash = normalizeTxHash(params.txHash);
  const roomKey = normalizeHex32(params.roomKey);

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Refund transaction failed");
  }

  let found = false;
  for (const log of receipt.logs) {
    if (!addressesEqual(log.address, escrow)) continue;
    try {
      const decoded = decodeEventLog({
        abi: competitiveEscrowAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Refunded") continue;
      if (
        (decoded.args.roomKey as string).toLowerCase() !== roomKey.toLowerCase()
      ) {
        throw new Error("Refund room key mismatch");
      }
      // Host refunds everyone; at least one Refunded for this room is enough.
      found = true;
      break;
    } catch (error) {
      if (error instanceof Error && error.message.includes("mismatch")) {
        throw error;
      }
    }
  }

  if (!found) {
    throw new Error("Refund event not found in transaction");
  }

  void params.expectedHost;
}

function getOwnerAccount() {
  const key = process.env.ESCROW_OWNER_PRIVATE_KEY;
  if (!key) {
    throw new Error("ESCROW_OWNER_PRIVATE_KEY is not configured");
  }
  const normalized = key.startsWith("0x") ? (key as Hex) : (`0x${key}` as Hex);
  return privateKeyToAccount(normalized);
}

export async function lockEscrowRoom(roomKey: string): Promise<Hash> {
  const account = getOwnerAccount();
  const client = getCompetitivePublicClient();
  const wallet = createWalletClient({
    account,
    chain: celoSepolia,
    transport: http(rpcUrl()),
  });
  const escrow = getEscrowAddress();
  const key = normalizeHex32(roomKey);

  const hash = await wallet.writeContract({
    address: escrow,
    abi: competitiveEscrowAbi,
    functionName: "lock",
    args: [key],
    chain: celoSepolia,
    account,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Escrow lock transaction failed");
  }
  return hash;
}

export async function settleEscrowRoom(params: {
  roomKey: string;
  winner: string;
}): Promise<Hash> {
  const account = getOwnerAccount();
  const client = getCompetitivePublicClient();
  const wallet = createWalletClient({
    account,
    chain: celoSepolia,
    transport: http(rpcUrl()),
  });
  const escrow = getEscrowAddress();
  const key = normalizeHex32(params.roomKey);
  const winner = params.winner as Address;

  const hash = await wallet.writeContract({
    address: escrow,
    abi: competitiveEscrowAbi,
    functionName: "settle",
    args: [key, winner],
    chain: celoSepolia,
    account,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Escrow settle transaction failed");
  }
  return hash;
}
