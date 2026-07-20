"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  http,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import {
  COMPETITIVE_TOKEN,
  ENTRY_FEE_RAW,
  competitiveEscrowAbi,
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
    throw new Error("Transaction failed");
  }
}

/** Fails early with a clear message when USDT / gas is missing. */
async function assertCanPayEntry(account: Address): Promise<void> {
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

  if (usdtBalance < ENTRY_FEE_RAW) {
    throw new Error(`Insufficient USDT on ${network} (need 0.20)`);
  }
  // ~0.0001 CELO is enough for approve + deposit; keep a small buffer.
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

/**
 * Approve + deposit ENTRY_FEE into the competitive escrow.
 * Returns roomKey and deposit tx hash for the create-room API.
 */
export async function depositCompetitiveEntry(params: {
  wallet: CompetitiveWallet;
  walletAddress?: string | null;
}): Promise<{ escrowRoomKey: Hex; depositTxHash: Hex }> {
  try {
    const escrow = getEscrowAddress();
    const chain = getCompetitiveChain();
    const { client, account } = await getWalletClient(params.wallet);
    assertWalletMatchesProfile(account, params.walletAddress);
    await assertCanPayEntry(account);

    const roomKey = generateEscrowRoomKey();

    const approveHash = await client.writeContract({
      address: COMPETITIVE_TOKEN.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, ENTRY_FEE_RAW],
      chain,
      account,
    });

    await waitForTx(approveHash);

    const depositTxHash = await client.writeContract({
      address: escrow,
      abi: competitiveEscrowAbi,
      functionName: "deposit",
      args: [roomKey],
      chain,
      account,
    });

    await waitForTx(depositTxHash);

    return { escrowRoomKey: roomKey, depositTxHash };
  } catch (error) {
    console.error("[depositCompetitiveEntry]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

/**
 * Approve + joinDeposit ENTRY_FEE into an existing competitive room.
 * If this wallet already paid on-chain, returns null (no new tx).
 */
export async function joinCompetitiveEntry(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
  walletAddress?: string | null;
}): Promise<Hex | null> {
  try {
    const escrow = getEscrowAddress();
    const chain = getCompetitiveChain();
    const { client, account } = await getWalletClient(params.wallet);
    assertWalletMatchesProfile(account, params.walletAddress);

    const alreadyPaid = await publicClient().readContract({
      address: escrow,
      abi: competitiveEscrowAbi,
      functionName: "hasPaid",
      args: [params.roomKey, account],
    });
    if (alreadyPaid) return null;

    await assertCanPayEntry(account);

    const approveHash = await client.writeContract({
      address: COMPETITIVE_TOKEN.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, ENTRY_FEE_RAW],
      chain,
      account,
    });

    await waitForTx(approveHash);

    const depositTxHash = await client.writeContract({
      address: escrow,
      abi: competitiveEscrowAbi,
      functionName: "joinDeposit",
      args: [params.roomKey],
      chain,
      account,
    });

    await waitForTx(depositTxHash);
    return depositTxHash;
  } catch (error) {
    console.error("[joinCompetitiveEntry]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

export async function refundCompetitiveEntry(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
}): Promise<Hex> {
  const escrow = getEscrowAddress();
  const chain = getCompetitiveChain();
  const { client, account } = await getWalletClient(params.wallet);

  const refundTxHash = await client.writeContract({
    address: escrow,
    abi: competitiveEscrowAbi,
    functionName: "refund",
    args: [params.roomKey],
    chain,
    account,
  });

  await waitForTx(refundTxHash);
  return refundTxHash;
}
