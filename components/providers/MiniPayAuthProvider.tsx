"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMiniPayEthereum,
  isMiniPay,
  type MiniPayEthereum,
} from "@/lib/minipay/detect";
import type { CompetitiveWallet } from "@/lib/celo/wallet-client";
import { getCompetitiveChain } from "@/lib/celo/constants";
import type { Profile } from "@/lib/profile/types";

const STORAGE_KEY = "partyk.minipay.session";

type StoredSession = {
  token: string;
  address: string;
};

type MiniPayAuthContextValue = {
  /** Detection finished (or not MiniPay). */
  ready: boolean;
  isMiniPay: boolean;
  authenticated: boolean;
  address: string | null;
  profile: Profile | null;
  needsUsername: boolean;
  error: string | null;
  wallet: CompetitiveWallet | null;
  getAccessToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
};

const MiniPayAuthContext = createContext<MiniPayAuthContextValue | null>(null);

async function readChainId(provider: MiniPayEthereum): Promise<number | null> {
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
  provider: MiniPayEthereum,
  chainId: number,
): Promise<void> {
  if ((await readChainId(provider)) === chainId) return;

  const hexId = `0x${chainId.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (error) {
    /* MiniPay often rejects redundant switches when already on Celo. */
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

function wrapMiniPayWallet(
  provider: MiniPayEthereum,
  address: string,
): CompetitiveWallet {
  return {
    address,
    switchChain: (chainId) => switchInjectedChain(provider, chainId),
    getEthereumProvider: async () => provider,
  };
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function MiniPayAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [miniPay, setMiniPay] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<CompetitiveWallet | null>(null);

  const applySession = useCallback(
    (next: {
      token: string;
      address: string;
      profile: Profile | null;
      needsUsername: boolean;
      provider: MiniPayEthereum;
    }) => {
      setToken(next.token);
      setAddress(next.address);
      setProfile(next.profile);
      setNeedsUsername(next.needsUsername);
      setWallet(wrapMiniPayWallet(next.provider, next.address));
      writeStoredSession({ token: next.token, address: next.address });
    },
    [],
  );

  const connect = useCallback(async () => {
    const provider = getMiniPayEthereum();
    if (!provider) {
      setError("MiniPay wallet not available");
      return;
    }

    setError(null);

    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    const raw = accounts[0];
    if (!raw) {
      setError("No MiniPay account returned");
      return;
    }

    try {
      await switchInjectedChain(provider, getCompetitiveChain().id);
    } catch {
      // MiniPay may already be on Celo; continue with session.
    }

    const res = await fetch("/api/minipay/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: raw }),
    });
    const json = (await res.json()) as {
      token?: string;
      profile?: Profile | null;
      needsUsername?: boolean;
      error?: string;
    };

    if (!res.ok || !json.token) {
      setError(json.error ?? "Could not start MiniPay session");
      return;
    }

    applySession({
      token: json.token,
      address: raw,
      profile: json.profile ?? null,
      needsUsername: json.needsUsername ?? !json.profile?.username,
      provider,
    });
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const inMiniPay = isMiniPay();
      if (!inMiniPay) {
        if (!cancelled) {
          setMiniPay(false);
          setReady(true);
        }
        return;
      }

      if (!cancelled) setMiniPay(true);

      const stored = readStoredSession();
      const provider = getMiniPayEthereum();

      if (stored && provider) {
        try {
          const accounts = (await provider.request({
            method: "eth_accounts",
          })) as string[];
          const current = accounts[0]?.toLowerCase();
          if (current && current === stored.address.toLowerCase()) {
            const res = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${stored.token}` },
            });
            if (res.ok) {
              const json = (await res.json()) as { profile?: Profile | null };
              if (!cancelled) {
                applySession({
                  token: stored.token,
                  address: stored.address,
                  profile: json.profile ?? null,
                  needsUsername: !json.profile?.username,
                  provider,
                });
                setReady(true);
                return;
              }
            }
          }
        } catch {
          // Fall through to a fresh connect.
        }
      }

      try {
        await connect();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "MiniPay connect failed");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applySession, connect]);

  const getAccessToken = useCallback(async () => token, [token]);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = (await res.json()) as { profile?: Profile | null };
    setProfile(json.profile ?? null);
    setNeedsUsername(!json.profile?.username);
  }, [token]);

  const logout = useCallback(() => {
    writeStoredSession(null);
    setToken(null);
    setAddress(null);
    setProfile(null);
    setNeedsUsername(false);
    setWallet(null);
    // MiniPay has no real logout — reconnect on next boot.
    void connect();
  }, [connect]);

  const value = useMemo<MiniPayAuthContextValue>(
    () => ({
      ready,
      isMiniPay: miniPay,
      authenticated: Boolean(token && address),
      address,
      profile,
      needsUsername,
      error,
      wallet,
      getAccessToken,
      refreshProfile,
      logout,
    }),
    [
      ready,
      miniPay,
      token,
      address,
      profile,
      needsUsername,
      error,
      wallet,
      getAccessToken,
      refreshProfile,
      logout,
    ],
  );

  return (
    <MiniPayAuthContext.Provider value={value}>
      {children}
    </MiniPayAuthContext.Provider>
  );
}

export function useMiniPayAuth(): MiniPayAuthContextValue {
  const ctx = useContext(MiniPayAuthContext);
  if (!ctx) {
    throw new Error("useMiniPayAuth must be used within MiniPayAuthProvider");
  }
  return ctx;
}
