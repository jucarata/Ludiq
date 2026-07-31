import {
  getCompetitiveChain,
  isCeloSepoliaMode,
} from "@/lib/celo/constants";
import type { CompetitiveWallet } from "@/lib/celo/wallet-client";
import {
  subscribeInjectedWallets,
  type DiscoveredWallet,
  type InjectedEthereumProvider,
} from "@/lib/wallet/eip6963";

type PrivyLikeWallet = {
  address: string;
  switchChain: (chainId: number) => Promise<void>;
  getEthereumProvider: () => Promise<{
    request: (args: {
      method: string;
      params?: unknown[];
    }) => Promise<unknown>;
  }>;
};

function shortAddr(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function listInjectedWallets(): Promise<DiscoveredWallet[]> {
  return new Promise((resolve) => {
    let latest: DiscoveredWallet[] = [];
    const stop = subscribeInjectedWallets((wallets) => {
      latest = wallets;
    });
    window.setTimeout(() => {
      stop();
      resolve(latest);
    }, 50);
  });
}

async function unlockMatchingAccount(
  provider: InjectedEthereumProvider,
  profileWallet: string,
): Promise<string> {
  let accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];

  const hasMatch = (list: string[] | undefined) =>
    (list ?? []).some(
      (account) => account.toLowerCase() === profileWallet.toLowerCase(),
    );

  if (!hasMatch(accounts)) {
    accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
  }

  if (!hasMatch(accounts)) {
    throw new Error(
      `Switch your browser wallet to ${shortAddr(profileWallet)} and try again.`,
    );
  }

  return profileWallet;
}

async function readChainId(
  provider: InjectedEthereumProvider,
): Promise<number | null> {
  try {
    const value = await provider.request({ method: "eth_chainId" });
    if (typeof value === "string") {
      return Number.parseInt(value, value.startsWith("0x") ? 16 : 10);
    }
    if (typeof value === "number") return value;
  } catch {
    /* ignore */
  }
  return null;
}

async function switchInjectedChain(
  provider: InjectedEthereumProvider,
  chainId: number,
): Promise<void> {
  const current = await readChainId(provider);
  if (current === chainId) return;

  const hexId = `0x${chainId.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (error) {
    /* MiniPay / some injectors reject redundant switches — succeed if already on chain. */
    if ((await readChainId(provider)) === chainId) return;

    const code =
      typeof error === "object" && error && "code" in error
        ? Number((error as { code: number }).code)
        : null;
    if (code !== 4902 && code !== -32603) throw error;

    const chain = getCompetitiveChain();
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [chain.rpcUrls.default.http[0]],
          blockExplorerUrls: chain.blockExplorers?.default
            ? [chain.blockExplorers.default.url]
            : [],
        },
      ],
    });
  }
}

function wrapInjectedWallet(
  provider: InjectedEthereumProvider,
  address: string,
): CompetitiveWallet {
  return {
    address,
    switchChain: (chainId) => switchInjectedChain(provider, chainId),
    getEthereumProvider: async () => provider,
  };
}

/**
 * Prefer a already-resolved wallet (Privy / MiniPay) that matches the profile.
 * If missing (common with email login), fall back to an injected browser
 * wallet unlocked to that same address (MetaMask, Rabby, MiniPay, …).
 */
export async function resolveCompetitiveWallet(params: {
  profileWallet: string;
  privyWallets: readonly PrivyLikeWallet[];
}): Promise<CompetitiveWallet> {
  const profile = params.profileWallet.toLowerCase();

  const fromLinked = params.privyWallets.find(
    (wallet) => wallet.address.toLowerCase() === profile,
  );
  if (fromLinked) return fromLinked;

  if (typeof window === "undefined") {
    throw new Error(
      `Connect your profile wallet (${shortAddr(params.profileWallet)}) and try again.`,
    );
  }

  const ethereum = (
    window as Window & {
      ethereum?: InjectedEthereumProvider & { isMiniPay?: boolean };
    }
  ).ethereum;

  // MiniPay injects window.ethereum without EIP-6963 announcements.
  if (ethereum?.isMiniPay) {
    await unlockMatchingAccount(ethereum, params.profileWallet);
    return wrapInjectedWallet(ethereum, params.profileWallet);
  }

  const injected = await listInjectedWallets();
  let lastError: unknown;

  for (const wallet of injected) {
    try {
      await unlockMatchingAccount(wallet.provider, params.profileWallet);
      return wrapInjectedWallet(wallet.provider, params.profileWallet);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;

  const network = isCeloSepoliaMode() ? "Celo Sepolia" : "Celo";
  throw new Error(
    `Unlock your wallet with ${shortAddr(params.profileWallet)} on ${network}, then try again.`,
  );
}
