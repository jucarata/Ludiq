"use client";

import { useEffect, useState } from "react";
import { useLoginWithSiwe } from "@privy-io/react-auth";
import { getAddress } from "viem";
import { celo } from "viem/chains";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { brandBodyFont, brandTitleFont } from "@/lib/fonts";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a24]/70 px-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={t("profile.signInWithWallet")}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-[1.5rem] border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] text-[var(--brand-navy)] shadow-[0_14px_0_rgba(20,23,77,0.85)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-[var(--brand-navy)]/10 bg-[linear-gradient(180deg,rgba(0,194,255,0.12),transparent)] px-5 py-4">
          <h2
            className={`${brandTitleFont.className} text-lg font-extrabold uppercase tracking-wide`}
          >
            {t("profile.signInWithWallet")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${brandBodyFont.className} rounded-xl border-2 border-[var(--brand-navy)] bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-[2px_2px_0_var(--brand-navy)] transition-[transform,box-shadow] duration-150 hover:brightness-95 active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--brand-navy)]`}
            aria-label={t("profile.closeWalletConnect")}
          >
            {t("profile.close")}
          </button>
        </div>

        <div className="px-5 py-5">
          <p
            className={`${brandBodyFont.className} mb-4 text-sm leading-relaxed font-semibold text-[var(--brand-navy)]/75`}
          >
            {t("profile.connectWalletHint")}
          </p>

          {wallets.length === 0 ? (
            <p
              className={`${brandBodyFont.className} rounded-2xl border-2 border-dashed border-[var(--brand-navy)]/35 px-3 py-4 text-center text-sm font-semibold text-[var(--brand-navy)]/65`}
            >
              {t("profile.noWalletsDetected")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {wallets.map((wallet) => {
                const busy = connectingRdns === wallet.info.rdns;
                return (
                  <li key={wallet.info.rdns}>
                    <button
                      type="button"
                      disabled={connectingRdns !== null}
                      onClick={() => void connectWallet(wallet)}
                      className="flex w-full items-center gap-3 rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(165deg,#00C2FF_0%,#0891B2_100%)] px-3 py-3 text-left text-white shadow-[3px_3px_0_var(--brand-navy)] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {wallet.info.icon ? (
                        // Wallet icons from extensions are data URLs.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={wallet.info.icon}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-lg border-2 border-white/50 bg-white"
                        />
                      ) : (
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-white/50 bg-white/20 text-xs font-bold"
                          aria-hidden
                        >
                          W
                        </span>
                      )}
                      <span
                        className={`${brandTitleFont.className} min-w-0 flex-1 truncate text-sm font-extrabold uppercase tracking-wide`}
                      >
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
              className={`${brandBodyFont.className} mt-3 text-center text-sm font-semibold text-[var(--brand-coral)]`}
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
