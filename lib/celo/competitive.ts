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
import {
  COMPETITIVE_TOKEN,
  ROOM_STATUS_ONCHAIN,
  partyEscrowAbi,
  getCompetitiveChain,
  getCompetitiveRpcUrl,
  getEscrowAddress,
} from "@/lib/celo/constants";

export {
  CELO_MAINNET_USDT,
  CELO_MAINNET_USDC,
  CELO_SEPOLIA_USDC,
  CELO_SEPOLIA_USDT,
  COMMISSION_SHARE_RAW,
  COMMISSION_SHARE_USDT,
  COMPETITIVE_TOKEN,
  ENTRY_FEE_RAW,
  ENTRY_FEE_USDT,
  PARTY_FEE_BPS,
  PARTY_FEE_CAP_RAW,
  PARTY_FEE_CAP_USDT,
  PARTY_MIN_POOL_RAW,
  PARTY_MIN_POOL_USDT,
  POOL_SHARE_RAW,
  POOL_SHARE_USDT,
  ROOM_STATUS_ONCHAIN,
  calcPartyFeeRaw,
  calcPartyTotalRaw,
  competitiveEscrowAbi,
  partyEscrowAbi,
  getCompetitiveChain,
  getCompetitiveRpcUrl,
  getEscrowAddress,
  isCeloSepoliaMode,
  isPotOpenStatus,
} from "@/lib/celo/constants";
export type { PotStatus } from "@/lib/celo/constants";

export { erc20Abi } from "viem";

export function getCompetitivePublicClient() {
  return createPublicClient({
    chain: getCompetitiveChain(),
    transport: http(getCompetitiveRpcUrl()),
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifyOpenTransaction(params: {
  txHash: string;
  roomKey: string;
  expectedHost: string;
}): Promise<{ roomKey: Hex; host: Address }> {
  const client = getCompetitivePublicClient();
  const escrow = getEscrowAddress();
  const txHash = normalizeTxHash(params.txHash);
  const roomKey = normalizeHex32(params.roomKey);

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Open transaction failed");
  }

  let opened: { roomKey: Hex; host: Address } | null = null;

  for (const log of receipt.logs) {
    if (!addressesEqual(log.address, escrow)) continue;
    try {
      const decoded = decodeEventLog({
        abi: partyEscrowAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Opened") continue;
      const host = decoded.args.host as Address;
      if (!addressesEqual(host, params.expectedHost)) continue;
      opened = {
        roomKey: decoded.args.roomKey as Hex,
        host,
      };
      break;
    } catch {
      // not our event
    }
  }

  if (!opened) {
    throw new Error("Open event not found in transaction");
  }
  if (opened.roomKey.toLowerCase() !== roomKey.toLowerCase()) {
    throw new Error("Open room key mismatch");
  }

  // Receipt can land before some RPCs expose contract state — retry briefly.
  let lastStatus: number | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const onchain = await client.readContract({
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "rooms",
      args: [roomKey],
    });
    lastStatus = Number(onchain[1]);
    if (lastStatus === ROOM_STATUS_ONCHAIN.Open) {
      if (!addressesEqual(onchain[0], params.expectedHost)) {
        throw new Error("Open host wallet mismatch");
      }
      return opened;
    }
    if (attempt < 4) await sleep(700 * (attempt + 1));
  }

  // Opened event is proof enough if state is still catching up.
  if (lastStatus === ROOM_STATUS_ONCHAIN.None || lastStatus === null) {
    throw new Error(
      "Escrow room is not open. Confirm NEXT_PUBLIC_ESCROW_ADDRESS is the PartyEscrow contract and restart the server.",
    );
  }

  return opened;
}

export async function verifyContributeTransaction(params: {
  txHash: string;
  roomKey: string;
  expectedPlayer: string;
  expectedPoolAmount?: bigint;
}): Promise<{
  roomKey: Hex;
  player: Address;
  poolAmount: bigint;
  feeAmount: bigint;
  totalPaid: bigint;
}> {
  const client = getCompetitivePublicClient();
  const escrow = getEscrowAddress();
  const txHash = normalizeTxHash(params.txHash);
  const roomKey = normalizeHex32(params.roomKey);

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Contribute transaction failed");
  }

  let contributed: {
    roomKey: Hex;
    player: Address;
    poolAmount: bigint;
    feeAmount: bigint;
    totalPaid: bigint;
  } | null = null;

  for (const log of receipt.logs) {
    if (!addressesEqual(log.address, escrow)) continue;
    try {
      const decoded = decodeEventLog({
        abi: partyEscrowAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Contributed") continue;
      const player = decoded.args.player as Address;
      if (!addressesEqual(player, params.expectedPlayer)) continue;
      contributed = {
        roomKey: decoded.args.roomKey as Hex,
        player,
        poolAmount: decoded.args.poolAmount as bigint,
        feeAmount: decoded.args.feeAmount as bigint,
        totalPaid: decoded.args.totalPaid as bigint,
      };
      break;
    } catch {
      // not our event
    }
  }

  if (!contributed) {
    throw new Error("Contribute event not found in transaction");
  }
  if (contributed.roomKey.toLowerCase() !== roomKey.toLowerCase()) {
    throw new Error("Contribute room key mismatch");
  }
  if (
    params.expectedPoolAmount != null &&
    contributed.poolAmount !== params.expectedPoolAmount
  ) {
    throw new Error("Contribute pool amount mismatch");
  }

  const onchain = await client.readContract({
    address: escrow,
    abi: partyEscrowAbi,
    functionName: "rooms",
    args: [roomKey],
  });

  if (
    onchain[1] !== ROOM_STATUS_ONCHAIN.Open &&
    onchain[1] !== ROOM_STATUS_ONCHAIN.Locked
  ) {
    throw new Error("Escrow room is not open");
  }

  return contributed;
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
        abi: partyEscrowAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Refunded") continue;
      if (
        (decoded.args.roomKey as string).toLowerCase() !== roomKey.toLowerCase()
      ) {
        throw new Error("Refund room key mismatch");
      }
      found = true;
      break;
    } catch (error) {
      if (error instanceof Error && error.message.includes("mismatch")) {
        throw error;
      }
    }
  }

  // Empty pot: refund/fullRefund still succeeds with no Refunded events.
  if (!found) {
    const onchain = await client.readContract({
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "rooms",
      args: [roomKey],
    });
    if (onchain[1] !== ROOM_STATUS_ONCHAIN.Refunded) {
      throw new Error("Refund event not found in transaction");
    }
  }

  void params.expectedHost;
}

export async function verifyKickRefundTransaction(params: {
  txHash: string;
  roomKey: string;
  expectedPlayer: string;
}): Promise<{ poolAmount: bigint; feeAmount: bigint; total: bigint }> {
  const client = getCompetitivePublicClient();
  const escrow = getEscrowAddress();
  const txHash = normalizeTxHash(params.txHash);
  const roomKey = normalizeHex32(params.roomKey);

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Kick refund transaction failed");
  }

  for (const log of receipt.logs) {
    if (!addressesEqual(log.address, escrow)) continue;
    try {
      const decoded = decodeEventLog({
        abi: partyEscrowAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "KickRefunded") continue;
      if (
        (decoded.args.roomKey as string).toLowerCase() !== roomKey.toLowerCase()
      ) {
        throw new Error("Kick refund room key mismatch");
      }
      if (!addressesEqual(decoded.args.player as string, params.expectedPlayer)) {
        throw new Error("Kick refund player mismatch");
      }
      return {
        poolAmount: decoded.args.poolAmount as bigint,
        feeAmount: decoded.args.feeAmount as bigint,
        total: decoded.args.total as bigint,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("mismatch") ||
          error.message.includes("Kick refund"))
      ) {
        throw error;
      }
    }
  }

  throw new Error("Kick refund event not found in transaction");
}

export async function verifyWithdrawTransaction(params: {
  txHash: string;
  roomKey: string;
  expectedPlayer: string;
}): Promise<{ poolAmount: bigint }> {
  const client = getCompetitivePublicClient();
  const escrow = getEscrowAddress();
  const txHash = normalizeTxHash(params.txHash);
  const roomKey = normalizeHex32(params.roomKey);

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Withdraw transaction failed");
  }

  for (const log of receipt.logs) {
    if (!addressesEqual(log.address, escrow)) continue;
    try {
      const decoded = decodeEventLog({
        abi: partyEscrowAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Withdrawn") continue;
      if (
        (decoded.args.roomKey as string).toLowerCase() !== roomKey.toLowerCase()
      ) {
        throw new Error("Withdraw room key mismatch");
      }
      if (!addressesEqual(decoded.args.player as string, params.expectedPlayer)) {
        throw new Error("Withdraw player mismatch");
      }
      return { poolAmount: decoded.args.poolAmount as bigint };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("mismatch") ||
          error.message.includes("Withdraw"))
      ) {
        throw error;
      }
    }
  }

  throw new Error("Withdraw event not found in transaction");
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
  const chain = getCompetitiveChain();
  const client = getCompetitivePublicClient();
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(getCompetitiveRpcUrl()),
  });
  const escrow = getEscrowAddress();
  const key = normalizeHex32(roomKey);

  const hash = await wallet.writeContract({
    address: escrow,
    abi: partyEscrowAbi,
    functionName: "lock",
    args: [key],
    chain,
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
  const chain = getCompetitiveChain();
  const client = getCompetitivePublicClient();
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(getCompetitiveRpcUrl()),
  });
  const escrow = getEscrowAddress();
  const key = normalizeHex32(params.roomKey);
  const winner = params.winner as Address;

  const hash = await wallet.writeContract({
    address: escrow,
    abi: partyEscrowAbi,
    functionName: "settle",
    args: [key, winner],
    chain,
    account,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Escrow settle transaction failed");
  }
  return hash;
}
