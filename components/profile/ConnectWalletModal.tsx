"use client";

import { useEffect, useState } from "react";
import { useLoginWithSiwe } from "@privy-io/react-auth";
import { getAddress } from "viem";
import { celo } from "viem/chains";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { retroActionFont } from "@/lib/fonts";
import {
  subscribeInjectedWallets,
  walletClientTypeFromRdns,
  type DiscoveredWallet,
} from "@/lib/wallet/eip6963";

type ConnectWalletModalProps = {
  onClose: () => void;
};

export function ConnectWalletModal({ onClose }: ConnectWalletModalProps) {
  const { t } = useTranslations();
  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe();
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [connectingRdns, setConnectingRdns] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeInjectedWallets(setWallets), []);

  const connectWallet = async (wallet: DiscoveredWallet) => {
    setConnectingRdns(wallet.info.rdns);
    setError(null);

    try {
      const accounts = (await wallet.provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const rawAddress = accounts[0];
      if (!rawAddress) {
        throw new Error("No account returned");
      }

      const address = getAddress(rawAddress);
      const chainId = `eip155:${celo.id}` as const;

      const message = await generateSiweMessage({ address, chainId });
      const signature = (await wallet.provider.request({
        method: "personal_sign",
        params: [message, address],
      })) as string;

      await loginWithSiwe({
        signature,
        message,
        walletClientType: walletClientTypeFromRdns(wallet.info.rdns),
        connectorType: "injected",
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/reject|denied|cancel/i.test(message)) {
        setError(t("profile.errorWalletRejected"));
      } else {
        setError(t("profile.errorWalletConnect"));
      }
    } finally {
      setConnectingRdns(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-5"
      role="dialog"
      aria-modal="true"
      aria-label={t("profile.signInWithWallet")}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] p-5 text-[#173532] shadow-[6px_6px_0_#173532]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            className={`${retroActionFont.className} text-[0.55rem] sm:text-[0.65rem]`}
          >
            {t("profile.signInWithWallet")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-[#173532] px-2 py-1 text-xs font-semibold uppercase"
            aria-label={t("profile.closeWalletConnect")}
          >
            {t("profile.close")}
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-[#173532]/75">
          {t("profile.connectWalletHint")}
        </p>

        {wallets.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-[#173532]/40 px-3 py-4 text-center text-sm text-[#173532]/70">
            {t("profile.noWalletsDetected")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {wallets.map((wallet) => {
              const busy = connectingRdns === wallet.info.rdns;
              return (
                <li key={wallet.info.rdns}>
                  <button
                    type="button"
                    disabled={connectingRdns !== null}
                    onClick={() => void connectWallet(wallet)}
                    className="flex w-full items-center gap-3 rounded-xl border-[3px] border-[#173532] bg-[var(--board-green)] px-3 py-3 text-left text-[var(--board-path)] shadow-[3px_3px_0_#173532] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {wallet.info.icon ? (
                      // Wallet icons from extensions are data URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={wallet.info.icon}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-lg"
                      />
                    ) : (
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--board-path)]/40 text-xs font-bold"
                        aria-hidden
                      >
                        W
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {busy
                        ? t("profile.connectingWallet")
                        : wallet.info.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error ? (
          <p
            className="mt-3 text-center text-sm text-[var(--board-red)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
