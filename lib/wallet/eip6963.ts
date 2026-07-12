import type { EIP1193Provider } from "viem";

export type Eip6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type DiscoveredWallet = {
  info: Eip6963ProviderInfo;
  provider: EIP1193Provider;
};

type Eip6963AnnounceEvent = CustomEvent<{
  info: Eip6963ProviderInfo;
  provider: EIP1193Provider;
}>;

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": Eip6963AnnounceEvent;
  }
}

function legacyInjectedWallet(): DiscoveredWallet | null {
  if (typeof window === "undefined") return null;
  const ethereum = (
    window as Window & { ethereum?: EIP1193Provider & { isMetaMask?: boolean } }
  ).ethereum;
  if (!ethereum) return null;
  return {
    info: {
      uuid: "legacy-injected",
      name: ethereum.isMetaMask ? "MetaMask" : "Browser wallet",
      icon: "",
      rdns: "browser.injected",
    },
    provider: ethereum,
  };
}

/**
 * Subscribe to EIP-6963 wallet announcements (Rabby, MetaMask, Rainbow, …).
 * Returns an unsubscribe function.
 */
export function subscribeInjectedWallets(
  onChange: (wallets: DiscoveredWallet[]) => void,
): () => void {
  if (typeof window === "undefined") {
    onChange([]);
    return () => {};
  }

  const byRdns = new Map<string, DiscoveredWallet>();

  const publish = () => {
    if (byRdns.size > 0) {
      onChange(
        Array.from(byRdns.values()).sort((a, b) =>
          a.info.name.localeCompare(b.info.name),
        ),
      );
      return;
    }
    const legacy = legacyInjectedWallet();
    onChange(legacy ? [legacy] : []);
  };

  const onAnnounce = (event: Eip6963AnnounceEvent) => {
    const { info, provider } = event.detail;
    if (!info?.rdns || !provider) return;
    byRdns.set(info.rdns, { info, provider });
    publish();
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // Wallets reply sync; publish once in case none announce.
  publish();

  return () => {
    window.removeEventListener("eip6963:announceProvider", onAnnounce);
  };
}

/** Map EIP-6963 rdns to Privy walletClientType when known. */
export function walletClientTypeFromRdns(rdns: string): string {
  const normalized = rdns.toLowerCase();
  if (normalized.includes("rabby")) return "rabby_wallet";
  if (normalized.includes("metamask")) return "metamask";
  if (normalized.includes("rainbow")) return "rainbow";
  if (normalized.includes("coinbase")) return "coinbase_wallet";
  if (normalized.includes("brave")) return "brave_wallet";
  if (normalized.includes("okx")) return "okx_wallet";
  if (normalized.includes("zerion")) return "zerion";
  return normalized.replace(/[^a-z0-9_]+/g, "_").slice(0, 48) || "unknown";
}
