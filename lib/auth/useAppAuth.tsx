"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useMiniPayAuth } from "@/components/providers/MiniPayAuthProvider";
import type { CompetitiveWallet } from "@/lib/celo/wallet-client";

export type AppAuth = {
  ready: boolean;
  authenticated: boolean;
  isMiniPay: boolean;
  walletAddress: string | null;
  email: string | null;
  getAccessToken: () => Promise<string | null>;
  logout: () => void | Promise<void>;
  /** Wallets usable with resolveCompetitiveWallet / Party txs. */
  competitiveWallets: readonly CompetitiveWallet[];
  miniPayError: string | null;
  refreshMiniPayProfile: () => Promise<void>;
  /** Privy login — only for non-MiniPay. */
  loginWithEmail: (() => void) | null;
};

const AppAuthContext = createContext<AppAuth | null>(null);

const GUEST_AUTH: AppAuth = {
  ready: true,
  authenticated: false,
  isMiniPay: false,
  walletAddress: null,
  email: null,
  getAccessToken: async () => null,
  logout: () => {},
  competitiveWallets: [],
  miniPayError: null,
  refreshMiniPayProfile: async () => {},
  loginWithEmail: null,
};

function PrivyBackedAppAuth({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const { wallets } = useWallets();

  const walletAddress = useMemo(() => {
    const linkedWallets =
      privy.user?.linkedAccounts?.filter(
        (account) => account.type === "wallet" && "address" in account,
      ) ?? [];

    const external = linkedWallets.find((account) => {
      if (!("walletClientType" in account)) return false;
      const clientType = account.walletClientType;
      return clientType !== "privy" && clientType !== "privy-v2";
    });
    if (external && "address" in external) {
      return external.address as string;
    }

    const embedded = privy.user?.wallet?.address;
    if (embedded) return embedded;

    const anyLinked = linkedWallets[0];
    if (anyLinked && "address" in anyLinked) {
      return anyLinked.address as string;
    }
    return null;
  }, [privy.user]);

  const value = useMemo<AppAuth>(
    () => ({
      ready: privy.ready,
      authenticated: privy.authenticated,
      isMiniPay: false,
      walletAddress,
      email:
        privy.user?.email?.address ?? privy.user?.google?.email ?? null,
      getAccessToken: () => privy.getAccessToken(),
      logout: () => privy.logout(),
      competitiveWallets: wallets as unknown as CompetitiveWallet[],
      miniPayError: null,
      refreshMiniPayProfile: async () => {},
      loginWithEmail: () => privy.login({ loginMethods: ["email"] }),
    }),
    [privy, walletAddress, wallets],
  );

  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}

function MiniPayBackedAppAuth({ children }: { children: ReactNode }) {
  const miniPay = useMiniPayAuth();

  const getAccessToken = useCallback(
    () => miniPay.getAccessToken(),
    [miniPay],
  );

  const value = useMemo<AppAuth>(
    () => ({
      ready: miniPay.ready,
      authenticated: miniPay.authenticated,
      isMiniPay: true,
      walletAddress: miniPay.address,
      email: null,
      getAccessToken,
      logout: () => miniPay.logout(),
      competitiveWallets: miniPay.wallet ? [miniPay.wallet] : [],
      miniPayError: miniPay.error,
      refreshMiniPayProfile: miniPay.refreshProfile,
      loginWithEmail: null,
    }),
    [miniPay, getAccessToken],
  );

  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}

/**
 * Unified auth: MiniPay auto-session inside the wallet WebView;
 * Privy (email / SIWE) everywhere else.
 */
export function AppAuthProvider({ children }: { children: ReactNode }) {
  const miniPay = useMiniPayAuth();
  const hasPrivy = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

  // Wait for MiniPay detection before mounting Privy-backed auth so we
  // never flash email/SIWE UI inside the MiniPay WebView.
  if (!miniPay.ready && !miniPay.isMiniPay) {
    return (
      <AppAuthContext.Provider value={{ ...GUEST_AUTH, ready: false }}>
        {children}
      </AppAuthContext.Provider>
    );
  }

  if (miniPay.isMiniPay) {
    return <MiniPayBackedAppAuth>{children}</MiniPayBackedAppAuth>;
  }

  if (!hasPrivy) {
    return (
      <AppAuthContext.Provider value={GUEST_AUTH}>
        {children}
      </AppAuthContext.Provider>
    );
  }

  return <PrivyBackedAppAuth>{children}</PrivyBackedAppAuth>;
}

export function useAppAuth(): AppAuth {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error("useAppAuth must be used within AppAuthProvider");
  }
  return ctx;
}
