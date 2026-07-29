"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FaStore } from "react-icons/fa6";
import { FriendsAuthGate } from "@/components/multiplayer/FriendsAuthGate";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { useAppAuth } from "@/lib/auth/useAppAuth";
import { resolveCompetitiveWallet } from "@/lib/celo/resolve-competitive-wallet";
import { purchaseKoins } from "@/lib/celo/wallet-client";
import { formatKoins } from "@/lib/koin/currency";
import {
  formatShopPriceUsdt,
  shopOfferIdFromSlug,
  type ShopOffer,
} from "@/lib/shop/offers";
import type { Profile } from "@/lib/profile/types";
import {
  brandBackButtonClassName,
  brandBodyFont,
  brandPlayButtonClassName,
  brandTitleFont,
} from "@/lib/fonts";

type BuyPhase = "idle" | "paying" | "confirming";

const PATH_COLORS = [
  "var(--brand-coral)",
  "var(--brand-yellow)",
  "var(--brand-mint)",
  "var(--brand-turquoise)",
  "var(--brand-purple)",
] as const;

const OFFER_ACCENTS = [
  "var(--brand-yellow)",
  "var(--brand-coral)",
  "var(--brand-turquoise)",
  "var(--brand-mint)",
  "var(--brand-purple)",
] as const;

function BrandPathStrip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex h-2 w-full overflow-hidden ${className}`}
      aria-hidden
    >
      {PATH_COLORS.map((color) => (
        <span
          key={color}
          className="relative h-full flex-1 border-r border-white/25 last:border-r-0"
          style={{ backgroundColor: color }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 bg-white/25" />
        </span>
      ))}
    </div>
  );
}

function KoinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="#FFC800"
        stroke="#14174D"
        strokeWidth="2.5"
      />
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="#14174D"
        strokeWidth="1.5"
        opacity="0.35"
      />
      <text
        x="16"
        y="17.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="800"
        fill="#14174D"
      >
        K
      </text>
    </svg>
  );
}

function ConfirmPurchaseModal({
  offer,
  busy,
  phase,
  onConfirm,
  onCancel,
}: {
  offer: ShopOffer;
  busy: boolean;
  phase: BuyPhase;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t, locale } = useTranslations();
  const amount = formatKoins(offer.koins, locale);
  const price = formatShopPriceUsdt(offer.price_usdt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a24]/70 px-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-confirm-title"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-[1.5rem] border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] text-[var(--brand-navy)] shadow-[0_14px_0_rgba(20,23,77,0.85)]"
        onClick={(event) => event.stopPropagation()}
      >
        <BrandPathStrip />
        <div className="border-b-[3px] border-[var(--brand-navy)]/10 bg-[linear-gradient(180deg,rgba(255,200,0,0.22),transparent)] px-5 py-4">
          <h2
            id="shop-confirm-title"
            className={`${brandTitleFont.className} text-lg font-extrabold uppercase tracking-wide`}
          >
            {t("shop.confirmTitle")}
          </h2>
        </div>

        <div className="flex flex-col items-center gap-4 px-5 py-6 text-center">
          <KoinIcon className="h-14 w-14" />
          <p
            className={`${brandBodyFont.className} text-sm font-semibold leading-relaxed text-[var(--brand-navy)]/80`}
          >
            {t("shop.confirmBody", { amount, price })}
          </p>

          <div className="mt-1 flex w-full flex-col gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={`${brandPlayButtonClassName} w-full min-w-0`}
            >
              {busy
                ? phase === "confirming"
                  ? t("shop.confirming")
                  : t("shop.paying")
                : t("shop.confirm")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className={`${brandBackButtonClassName} w-full min-w-0`}
            >
              {t("shop.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  accent,
  disabled,
  onSelect,
}: {
  offer: ShopOffer;
  accent: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { t, locale } = useTranslations();
  const amount = formatKoins(offer.koins, locale);
  const price = formatShopPriceUsdt(offer.price_usdt);

  return (
    <li className="min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        aria-label={t("shop.offerAria", { amount, price })}
        className="flex w-full flex-col items-center overflow-hidden rounded-xl border-[2.5px] border-[var(--brand-navy)] bg-[var(--brand-cream)] shadow-[3px_3px_0_rgba(20,23,77,0.85)] transition-[transform,box-shadow,filter] duration-150 hover:brightness-105 active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_rgba(20,23,77,0.85)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[3px_3px_0_rgba(20,23,77,0.85)]"
      >
        <span
          className="h-1.5 w-full shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
        <span className="flex w-full flex-col items-center gap-1 px-1.5 py-2">
          <KoinIcon className="h-7 w-7" />
          <span
            className={`${brandTitleFont.className} text-sm font-extrabold leading-none tracking-wide text-[var(--brand-navy)]`}
          >
            {t("shop.offerAmount", { amount })}
          </span>
          <span
            className={`${brandBodyFont.className} text-[10px] font-bold leading-none text-[var(--brand-navy)]/65`}
          >
            {t("shop.offerPrice", { price })}
          </span>
        </span>
      </button>
    </li>
  );
}

function ShopSection({
  titleId,
  title,
  children,
}: {
  titleId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className="space-y-2.5">
      <div className="flex items-center gap-2 px-0.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-[2.5px] border-[var(--brand-navy)] bg-[var(--brand-yellow)] shadow-[2px_2px_0_rgba(20,23,77,0.75)]"
          aria-hidden
        >
          <KoinIcon className="h-4 w-4" />
        </span>
        <h2
          id={titleId}
          className={`${brandTitleFont.className} text-base font-extrabold uppercase tracking-wide text-[var(--brand-cream)] sm:text-lg`}
          style={{ textShadow: "0 2px 0 rgba(20,23,77,0.55)" }}
        >
          {title}
        </h2>
      </div>

      <div className="rounded-[1.35rem] border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(165deg,#FFE566_0%,#FFC800_45%,#F0A800_100%)] p-3 shadow-[5px_5px_0_rgba(20,23,77,0.85),inset_0_1px_0_rgba(255,248,240,0.45)] sm:p-3.5">
        {children}
      </div>
    </section>
  );
}

function ShopContent() {
  const { t, locale } = useTranslations();
  const { getAccessToken, competitiveWallets } = useAppAuth();

  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [koinsBalance, setKoinsBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<ShopOffer | null>(null);
  const [phase, setPhase] = useState<BuyPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const busy = phase !== "idle";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [offersRes, profileRes] = await Promise.all([
        fetch("/api/shop/offers"),
        token ? fetch("/api/profile", { headers }) : Promise.resolve(null),
      ]);

      const offersJson = (await offersRes.json()) as {
        offers?: ShopOffer[];
        error?: string;
      };
      if (!offersRes.ok) {
        throw new Error(offersJson.error ?? t("shop.errorLoad"));
      }
      setOffers(offersJson.offers ?? []);

      if (profileRes) {
        const profileJson = (await profileRes.json()) as {
          profile?: Profile | null;
        };
        if (profileRes.ok) {
          setKoinsBalance(profileJson.profile?.koins ?? 0);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shop.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (offer: ShopOffer) => {
    setError(null);
    setSuccess(null);
    setPhase("paying");

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error(t("shop.errorSession"));
      }

      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileJson = (await profileRes.json()) as {
        profile?: Profile | null;
        error?: string;
      };
      if (!profileRes.ok || !profileJson.profile?.wallet_address) {
        throw new Error(profileJson.error ?? t("shop.errorWalletRequired"));
      }

      const profileWallet = profileJson.profile.wallet_address;
      const wallet = await resolveCompetitiveWallet({
        profileWallet,
        privyWallets: competitiveWallets,
      });

      const txHash = await purchaseKoins({
        wallet,
        offerId: shopOfferIdFromSlug(offer.slug),
        amountUsdt: offer.price_usdt,
        expectedWalletAddress: profileWallet,
      });

      setPhase("confirming");

      const confirmRes = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ offerId: offer.id, txHash }),
      });
      const confirmJson = (await confirmRes.json()) as {
        ok?: boolean;
        koins?: number;
        koinsBalance?: number | null;
        profile?: Profile | null;
        error?: string;
      };

      if (!confirmRes.ok) {
        throw new Error(confirmJson.error ?? t("shop.errorConfirm"));
      }

      const credited = confirmJson.koins ?? offer.koins;
      const balance =
        confirmJson.koinsBalance ?? confirmJson.profile?.koins ?? null;
      if (typeof balance === "number") {
        setKoinsBalance(balance);
      } else {
        setKoinsBalance((prev) => (prev ?? 0) + credited);
      }

      setSelectedOffer(null);
      setSuccess(
        t("shop.purchaseSuccess", {
          amount: formatKoins(credited, locale),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shop.errorBuy"));
    } finally {
      setPhase("idle");
    }
  };

  return (
    <main className="relative mx-auto flex w-full min-h-0 flex-1 flex-col overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-[var(--brand-coral)]/25 blur-3xl" />
        <div className="absolute -right-10 top-24 h-44 w-44 rounded-full bg-[var(--brand-turquoise)]/30 blur-3xl" />
        <div className="absolute bottom-28 left-1/3 h-36 w-36 rounded-full bg-[var(--brand-purple)]/25 blur-3xl" />
        <div className="absolute right-8 top-[45%] h-28 w-28 rounded-full bg-[var(--brand-yellow)]/20 blur-2xl" />
        <div className="absolute bottom-40 left-6 h-24 w-24 rounded-full bg-[var(--brand-mint)]/25 blur-2xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-5 px-5 py-7 sm:gap-6 sm:px-6 sm:py-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 scale-125 rounded-full bg-[radial-gradient(circle,rgba(255,75,110,0.45),transparent_70%)] blur-md"
              aria-hidden
            />
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(145deg,var(--brand-coral)_0%,var(--brand-purple)_55%,var(--brand-turquoise)_100%)] text-white shadow-[4px_4px_0_rgba(20,23,77,0.85)] sm:h-[4.25rem] sm:w-[4.25rem]">
              <FaStore className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
            </div>
          </div>

          <div className="space-y-2">
            <h1
              className={`${brandTitleFont.className} text-3xl font-extrabold tracking-wide text-[var(--brand-cream)] sm:text-4xl`}
              style={{ textShadow: "0 3px 0 rgba(20,23,77,0.65)" }}
            >
              {t("shop.title")}
            </h1>
            <BrandPathStrip className="mx-auto max-w-[11rem] rounded-full border-2 border-[var(--brand-navy)] shadow-[2px_2px_0_rgba(20,23,77,0.65)]" />
          </div>

          {koinsBalance != null ? (
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--brand-navy)] bg-[var(--brand-yellow)] px-3.5 py-1.5 shadow-[3px_3px_0_rgba(20,23,77,0.85)]">
              <KoinIcon className="h-4 w-4" />
              <span
                className={`${brandTitleFont.className} text-sm font-extrabold uppercase text-[var(--brand-navy)]`}
              >
                {t("shop.yourBalance", {
                  amount: formatKoins(koinsBalance, locale),
                })}
              </span>
            </div>
          ) : null}
        </header>

        <ShopSection titleId="buy-koins-heading" title={t("shop.buyKoins")}>
          {loading ? (
            <p
              className={`${brandBodyFont.className} py-4 text-center text-sm font-semibold text-[var(--brand-navy)]/70`}
            >
              {t("shop.loading")}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 sm:gap-2.5">
              {offers.map((offer, index) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  accent={OFFER_ACCENTS[index % OFFER_ACCENTS.length]}
                  disabled={busy}
                  onSelect={() => {
                    setError(null);
                    setSuccess(null);
                    setSelectedOffer(offer);
                  }}
                />
              ))}
            </ul>
          )}
        </ShopSection>

        {success ? (
          <p
            className={`${brandBodyFont.className} rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-mint)] px-4 py-2.5 text-center text-sm font-bold text-white shadow-[3px_3px_0_rgba(20,23,77,0.85)]`}
            role="status"
          >
            {success}
          </p>
        ) : null}
        {error ? (
          <p
            className={`${brandBodyFont.className} rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-coral)] px-4 py-2.5 text-center text-sm font-bold text-white shadow-[3px_3px_0_rgba(20,23,77,0.85)]`}
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      {selectedOffer ? (
        <ConfirmPurchaseModal
          offer={selectedOffer}
          busy={busy}
          phase={phase}
          onConfirm={() => void buy(selectedOffer)}
          onCancel={() => {
            if (busy) return;
            setSelectedOffer(null);
          }}
        />
      ) : null}
    </main>
  );
}

export function ShopView() {
  return (
    <FriendsAuthGate>
      <ShopContent />
    </FriendsAuthGate>
  );
}
