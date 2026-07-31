"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  http,
  parseUnits,
  type Abi,
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
  getCompetitiveFeeCurrency,
  getCompetitiveRpcUrl,
  getEscrowAddress,
  isCeloSepoliaMode,
} from "@/lib/celo/constants";
import { generateEscrowRoomKey } from "@/lib/celo/competitive-key";
import { formatCompetitiveTxError } from "@/lib/celo/wallet-errors";
import { isMiniPay } from "@/lib/minipay/detect";

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

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

/** Extra USDT reserved for MiniPay network fees (approve + action). */
const MINIPAY_FEE_BUFFER_RAW = parseUnits("0.02", COMPETITIVE_TOKEN.decimals);

function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = value.startsWith("0x")
      ? Number.parseInt(value, 16)
      : Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function readProviderChainId(
  provider: EthereumProvider,
): Promise<number | null> {
  try {
    return parseChainId(await provider.request({ method: "eth_chainId" }));
  } catch {
    return null;
  }
}

/**
 * Ensure the injected wallet is on the party chain. MiniPay often rejects
 * redundant switchChain calls — treat "already on chain" as success.
 */
async function ensurePartyChain(
  wallet: CompetitiveWallet,
): Promise<EthereumProvider> {
  const chain = getCompetitiveChain();
  const provider = await wallet.getEthereumProvider();
  const currentId = await readProviderChainId(provider);
  if (currentId === chain.id) return provider;

  try {
    await wallet.switchChain(chain.id);
  } catch (error) {
    const afterId = await readProviderChainId(provider);
    if (afterId === chain.id) return provider;
    throw error;
  }

  return provider;
}

async function getWalletClient(
  wallet: CompetitiveWallet,
): Promise<{
  client: WalletClient;
  account: Address;
  provider: EthereumProvider;
}> {
  const chain = getCompetitiveChain();
  const provider = await ensurePartyChain(wallet);
  const account = wallet.address as Address;

  const client = createWalletClient({
    account,
    chain,
    transport: custom(provider),
  });

  return { client, account, provider };
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

function partyTxFeeFields(): { feeCurrency?: Address } {
  // MiniPay: pay network fee in USDT via CIP-64 (no CELO in the wallet UI).
  if (!isMiniPay()) return {};
  const feeCurrency = getCompetitiveFeeCurrency();
  return feeCurrency ? { feeCurrency } : {};
}

function usesStablecoinNetworkFee(): boolean {
  return isMiniPay() && Boolean(getCompetitiveFeeCurrency());
}

/**
 * MiniPay rejects EIP-1559 fee fields that viem's writeContract fills in.
 * Send a legacy-style eth_sendTransaction with feeCurrency only.
 */
async function writeContractMiniPay(params: {
  provider: EthereumProvider;
  account: Address;
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}): Promise<Hex> {
  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });
  const feeCurrency = getCompetitiveFeeCurrency();
  const pub = publicClient();

  const gas = await pub.estimateGas({
    account: params.account,
    to: params.address,
    data,
    ...(feeCurrency ? { feeCurrency } : {}),
  });

  const tx: Record<string, string> = {
    from: params.account,
    to: params.address,
    data,
    gas: `0x${gas.toString(16)}`,
  };
  if (feeCurrency) tx.feeCurrency = feeCurrency;

  const hash = await params.provider.request({
    method: "eth_sendTransaction",
    params: [tx],
  });

  if (typeof hash !== "string" || !hash.startsWith("0x")) {
    throw new Error("MiniPay did not return a transaction hash");
  }
  return hash as Hex;
}

async function writePartyContract(params: {
  client: WalletClient;
  provider: EthereumProvider;
  account: Address;
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  chain: ReturnType<typeof getCompetitiveChain>;
}): Promise<Hex> {
  if (isMiniPay()) {
    return writeContractMiniPay({
      provider: params.provider,
      account: params.account,
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
    });
  }

  return params.client.writeContract({
    address: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
    chain: params.chain,
    account: params.account,
    ...partyTxFeeFields(),
  });
}

async function assertCanPay(account: Address, totalRaw: bigint): Promise<void> {
  const client = publicClient();
  const usdtBalance = await client.readContract({
    address: COMPETITIVE_TOKEN.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });

  const network = isCeloSepoliaMode() ? "Celo Sepolia" : "Celo";
  const required =
    usesStablecoinNetworkFee() || isMiniPay()
      ? totalRaw + MINIPAY_FEE_BUFFER_RAW
      : totalRaw;

  if (usdtBalance < required) {
    throw new Error(
      isMiniPay()
        ? "Not enough USDT for this payment and the network fee"
        : `Insufficient USDT on ${network}`,
    );
  }

  // MiniPay (mainnet) pays the network fee in USDT — skip native CELO check.
  if (usesStablecoinNetworkFee() || isMiniPay()) {
    return;
  }

  const celoBalance = await client.getBalance({ address: account });
  if (celoBalance < BigInt("100000000000000")) {
    throw new Error(
      isCeloSepoliaMode()
        ? "Need CELO for network fees on Celo Sepolia (USDT alone is not enough). Get free CELO at faucet.celo.org/celo-sepolia"
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
    const { client, account, provider } = await getWalletClient(params.wallet);
    assertWalletMatchesProfile(account, params.walletAddress);

    if (!usesStablecoinNetworkFee() && !isMiniPay()) {
      const celoBalance = await publicClient().getBalance({ address: account });
      if (celoBalance < BigInt("100000000000000")) {
        throw new Error(
          isCeloSepoliaMode()
            ? "Need CELO for network fees on Celo Sepolia"
            : "Need CELO for network fees on Celo",
        );
      }
    }

    const roomKey = generateEscrowRoomKey();
    const pub = publicClient();
    const feeFields = partyTxFeeFields();

    // Fail fast if address is still the old CompetitiveEscrow (no open()).
    try {
      await pub.simulateContract({
        address: escrow,
        abi: partyEscrowAbi,
        functionName: "open",
        args: [roomKey],
        account,
        ...feeFields,
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

    const openTxHash = await writePartyContract({
      client,
      provider,
      account,
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "open",
      args: [roomKey],
      chain,
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
    const { client, account, provider } = await getWalletClient(params.wallet);
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

    const approveHash = await writePartyContract({
      client,
      provider,
      account,
      address: COMPETITIVE_TOKEN.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, totalRaw],
      chain,
    });
    await waitForTx(approveHash);

    const contributeTxHash = await writePartyContract({
      client,
      provider,
      account,
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "contribute",
      args: [params.roomKey, poolAmountRaw],
      chain,
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
  const { client, account, provider } = await getWalletClient(params.wallet);

  const refundTxHash = await writePartyContract({
    client,
    provider,
    account,
    address: escrow,
    abi: partyEscrowAbi,
    functionName: "refund",
    args: [params.roomKey],
    chain,
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
  const { client, account, provider } = await getWalletClient(params.wallet);

  const refundTxHash = await writePartyContract({
    client,
    provider,
    account,
    address: escrow,
    abi: partyEscrowAbi,
    functionName: "fullRefund",
    args: [params.roomKey],
    chain,
  });

  await waitForTx(refundTxHash);
  return refundTxHash;
}

/** Host returns pool + fee to one player (kick). Host pays network fee. */
export async function kickRefundParty(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
  player: Address;
}): Promise<Hex> {
  const escrow = getEscrowAddress();
  const chain = getCompetitiveChain();
  const { client, account, provider } = await getWalletClient(params.wallet);

  try {
    const txHash = await writePartyContract({
      client,
      provider,
      account,
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "kickRefund",
      args: [params.roomKey, params.player],
      chain,
    });
    await waitForTx(txHash);
    return txHash;
  } catch (error) {
    console.error("[kickRefundParty]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

/** Contributor withdraws pool only (fee stays). Caller pays network fee. */
export async function withdrawPartyContribution(params: {
  wallet: CompetitiveWallet;
  roomKey: Hex;
}): Promise<Hex> {
  const escrow = getEscrowAddress();
  const chain = getCompetitiveChain();
  const { client, account, provider } = await getWalletClient(params.wallet);

  try {
    const txHash = await writePartyContract({
      client,
      provider,
      account,
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "withdrawContribution",
      args: [params.roomKey],
      chain,
    });
    await waitForTx(txHash);
    return txHash;
  } catch (error) {
    console.error("[withdrawPartyContribution]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}

/** Approve + pay USDT into the escrow treasury for a shop offer. */
export async function purchaseKoins(params: {
  wallet: CompetitiveWallet;
  offerId: Hex;
  amountUsdt: string | number;
  expectedWalletAddress?: string | null;
}): Promise<Hex> {
  try {
    const escrow = getEscrowAddress();
    const chain = getCompetitiveChain();
    const { client, account, provider } = await getWalletClient(params.wallet);
    assertWalletMatchesProfile(account, params.expectedWalletAddress);

    const amountRaw = parseUnits(
      typeof params.amountUsdt === "number"
        ? params.amountUsdt.toFixed(COMPETITIVE_TOKEN.decimals)
        : String(params.amountUsdt),
      COMPETITIVE_TOKEN.decimals,
    );

    if (amountRaw <= BigInt(0)) {
      throw new Error("Invalid purchase amount");
    }

    await assertCanPay(account, amountRaw);

    const approveTxHash = await writePartyContract({
      client,
      provider,
      account,
      address: COMPETITIVE_TOKEN.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, amountRaw],
      chain,
    });
    await waitForTx(approveTxHash);

    const purchaseTxHash = await writePartyContract({
      client,
      provider,
      account,
      address: escrow,
      abi: partyEscrowAbi,
      functionName: "purchase",
      args: [params.offerId, amountRaw],
      chain,
    });
    await waitForTx(purchaseTxHash);
    return purchaseTxHash;
  } catch (error) {
    console.error("[purchaseKoins]", error);
    throw new Error(formatCompetitiveTxError(error));
  }
}
