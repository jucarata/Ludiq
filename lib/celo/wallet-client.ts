"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  http,
  parseUnits,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import {
  COMPETITIVE_TOKEN,
  PARTY_MIN_POOL_RAW,
  calcPartyTotalRaw,
  partyEscrowAbi,
  getCompetitiveChain,
  getCompetitiveRpcUrl,
  getEscrowAddress,
  isCeloSepoliaMode,
} from "@/lib/celo/constants";
import { generateEscrowRoomKey } from "@/lib/celo/competitive-key";
import { formatCompetitiveTxError } from "@/lib/celo/wallet-errors";

export type CompetitiveWallet = {
  address: string;
  switchChain: (chainId: number) => Promise<void>;
  getEthereumProvider: () => Promise<{
    request: (args: {
      method: string;
      params?: unknown[];
    }) => Promise<unknown>;
  }>;
};

async function getWalletClient(
  wallet: CompetitiveWallet,
): Promise<{ client: WalletClient; account: Address }> {
  const chain = getCompetitiveChain();
  await wallet.switchChain(chain.id);
  const provider = await wallet.getEthereumProvider();
  const account = wallet.address as Address;

  const client = createWalletClient({
    account,
    chain,
    transport: custom(provider),
  });

  return { client, account };
}

function publicClient() {
  return createPublicClient({
    chain: getCompetitiveChain(),
    transport: http(getCompetitiveRpcUrl()),
  });
}

async function waitForTx(hash: Hex): Promise<void> {
  const receipt = await publicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(
      "On-chain transaction reverted. If you just switched to Party mode, deploy PartyEscrow and update NEXT_PUBLIC_ESCROW_ADDRESS.",
    );
  }
}

async function assertCanPay(account: Address, totalRaw: bigint): Promise<void> {
  const client = publicClient();
  const [usdtBalance, celoBalance] = await Promise.all([
    client.readContract({
      address: COMPETITIVE_TOKEN.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account],
    }),
    client.getBalance({ address: account }),
  ]);

  const network = isCeloSepoliaMode() ? "Celo Sepolia" : "Celo";

  if (usdtBalance < totalRaw) {
    throw new Error(`Insufficient USDT on ${network}`);
  }
  if (celoBalance < BigInt("100000000000000")) {
    throw new Error(
      isCeloSepoliaMode()
        ? "Need CELO for gas on Celo Sepolia (USDT alone is not enough). Get free CELO at faucet.celo.org/celo-sepolia"
        : "Need CELO for network fees on Celo (USDT alone is not enough).",
    );
  }
}

function assertWalletMatchesProfile(
  account: Address,
  walletAddress?: string | null,
): void {
  if (
    walletAddress &&
    account.toLowerCase() !== walletAddress.toLowerCase()
  ) {
    throw new Error(
      `Connected wallet does not match your profile wallet (${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)})`,
    );
  }
}

/** Host opens a party escrow room (no deposit required). */
export async function openPartyRoom(params: {
  wallet: CompetitiveWallet;
  walletAddress?: string | null;
}): Promise<{ escrowRoomKey: Hex; openTxHash: Hex }> {
  try {
    const escrow = getEscrowAddress();
    const chain = getCompetitiveChain();
    const { client, account } = await getWalletClient(params.wallet);
    assertWalletMatchesProfile(account, params.walletAddress);

    const celoBalance = await publicClient().getBalance({ address: account });
    if (celoBalance < BigInt("100000000000000")) {
      throw new Error(
        isCeloSepoliaMode()
          ? "Need CELO for gas on Celo Sepolia"
          : "Need CELO for network fees on Celo",
      );
    }

    const roomKey = generateEscrowRoomKey();
    const pub = publicClient();

    // Fail fast if address is still the old CompetitiveEscrow (no open()).
    try {
      await pub.simulateContract({
        address: escrow,
        abi: partyEscrowAbi,
        functionName: "open",
        args: [roomKey],
        account,
      });
    } catch (simError) {
      const msg =
        simError instanceof Error ? simError.message.toLowerCase() : "";
      if (
        msg.includes("does not match any existing") ||
        msg.includes("encoded function data") ||
        msg.includes("function returned an unexpected") ||
        msg.includes("execution reverted") ||
        msg.includes("returned no data")
      ) {
        throw new Error(
          "PartyEscrow is not deployed at NEXT_PUBLIC_ESCROW_ADDRESS (still the old competitive contract?). Deploy PartyEscrow and update the address, then restart the app.",
        );
      }
      throw simError;
    }

    const openTxHash = await client.writeContract({
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "open",
      args: [roomKey],
      chain,
      account,
    });

    await waitForTx(openTxHash);
    return { escrowRoomKey: roomKey, openTxHash };
  } catch (error) {
    console.error("[openPartyRoom]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

/** Approve + contribute poolAmount (plus fee) into an open party room. */
export async function contributeParty(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
  poolAmountUsdt: string;
  walletAddress?: string | null;
}): Promise<Hex> {
  try {
    const escrow = getEscrowAddress();
    const chain = getCompetitiveChain();
    const { client, account } = await getWalletClient(params.wallet);
    assertWalletMatchesProfile(account, params.walletAddress);

    const poolAmountRaw = parseUnits(
      params.poolAmountUsdt,
      COMPETITIVE_TOKEN.decimals,
    );
    if (poolAmountRaw < PARTY_MIN_POOL_RAW) {
      throw new Error("Minimum contribution is 0.01 USDT");
    }

    const totalRaw = calcPartyTotalRaw(poolAmountRaw);
    await assertCanPay(account, totalRaw);

    const approveHash = await client.writeContract({
      address: COMPETITIVE_TOKEN.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, totalRaw],
      chain,
      account,
    });
    await waitForTx(approveHash);

    const contributeTxHash = await client.writeContract({
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "contribute",
      args: [params.roomKey, poolAmountRaw],
      chain,
      account,
    });
    await waitForTx(contributeTxHash);
    return contributeTxHash;
  } catch (error) {
    console.error("[contributeParty]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

/** Host refunds pool only (keeps commission). */
export async function refundPartyPool(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
}): Promise<Hex> {
  const escrow = getEscrowAddress();
  const chain = getCompetitiveChain();
  const { client, account } = await getWalletClient(params.wallet);

  const refundTxHash = await client.writeContract({
    address: escrow,
    abi: partyEscrowAbi,
    functionName: "refund",
    args: [params.roomKey],
    chain,
    account,
  });

  await waitForTx(refundTxHash);
  return refundTxHash;
}

/** Host full refund (pool + fee) on error path. */
export async function fullRefundParty(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
}): Promise<Hex> {
  const escrow = getEscrowAddress();
  const chain = getCompetitiveChain();
  const { client, account } = await getWalletClient(params.wallet);

  const refundTxHash = await client.writeContract({
    address: escrow,
    abi: partyEscrowAbi,
    functionName: "fullRefund",
    args: [params.roomKey],
    chain,
    account,
  });

  await waitForTx(refundTxHash);
  return refundTxHash;
}

/** Host returns pool + fee to one player (kick). Host pays gas. */
export async function kickRefundParty(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
  player: Address;
}): Promise<Hex> {
  const escrow = getEscrowAddress();
  const chain = getCompetitiveChain();
  const { client, account } = await getWalletClient(params.wallet);

  try {
    const txHash = await client.writeContract({
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "kickRefund",
      args: [params.roomKey, params.player],
      chain,
      account,
    });
    await waitForTx(txHash);
    return txHash;
  } catch (error) {
    console.error("[kickRefundParty]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

/** Contributor withdraws pool only (fee stays). Caller pays gas. */
export async function withdrawPartyContribution(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
}): Promise<Hex> {
  const escrow = getEscrowAddress();
  const chain = getCompetitiveChain();
  const { client, account } = await getWalletClient(params.wallet);

  try {
    const txHash = await client.writeContract({
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "withdrawContribution",
      args: [params.roomKey],
      chain,
      account,
    });
    await waitForTx(txHash);
    return txHash;
  } catch (error) {
    console.error("[withdrawPartyContribution]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

/** @deprecated Use refundPartyPool */
export const refundCompetitiveEntry = refundPartyPool;
