"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FaCheck, FaCopy, FaGear, FaWallet } from "react-icons/fa6";
import { useLocale, useTranslations } from "@/components/i18n/LocaleProvider";
import { ConnectWalletModal } from "@/components/profile/ConnectWalletModal";
import { useAppAuth } from "@/lib/auth/useAppAuth";
import type { Profile } from "@/lib/profile/types";
import {
  mapApiErrorToMessageKey,
  validateUsername,
} from "@/lib/profile/types";
import {
  languageOptionToLocale,
  localeToLanguageOption,
  type LanguageOption,
  type MessageKey,
} from "@/lib/i18n";
import {
  brandBackButtonClassName,
  brandBodyFont,
  brandPlayButtonClassName,
  brandSecondaryButtonClassName,
  brandTitleFont,
} from "@/lib/fonts";
import {
  fetchCeloTokenBalances,
  type TokenBalance,
} from "@/lib/celo/tokens";
import { formatKoins } from "@/lib/koin/currency";

function ProfileAvatar({ size = "lg" }: { size?: "md" | "lg" }) {
  const dim =
    size === "lg"
      ? "h-36 w-36 sm:h-40 sm:w-40"
      : "h-28 w-28 sm:h-32 sm:w-32";

  return (
    <div className="relative" aria-hidden>
      <div
        className="pointer-events-none absolute inset-0 scale-125 rounded-full bg-[radial-gradient(circle,rgba(0,194,255,0.35),transparent_70%)] blur-md"
      />
      <div
        className={`relative flex ${dim} items-center justify-center rounded-full border-[4px] border-[var(--brand-navy)] bg-[linear-gradient(165deg,#00C2FF_0%,#2ECC71_55%,#6A3DF3_100%)] shadow-[0_8px_0_rgba(20,23,77,0.85)]`}
      >
        <div className="flex h-[78%] w-[78%] items-center justify-center rounded-full border-[3px] border-white/70 bg-[var(--brand-cream)]">
          <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]">
            <ellipse cx="32" cy="46" rx="14" ry="12" fill="#FFF8F0" />
            <circle cx="32" cy="24" r="14" fill="#FFF8F0" />
            <circle cx="27" cy="23" r="2.2" fill="#14174D" />
            <circle cx="37" cy="23" r="2.2" fill="#14174D" />
            <path
              d="M26 29c2.2 2.4 9.8 2.4 12 0"
              fill="none"
              stroke="#14174D"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="22.5" cy="27" r="2" fill="#FF4B6E" opacity="0.45" />
            <circle cx="41.5" cy="27" r="2" fill="#FF4B6E" opacity="0.45" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function KoinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14" fill="#FFC800" stroke="#14174D" strokeWidth="2.5" />
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

function KoinBalanceBadge({ amount }: { amount: number }) {
  const { t, locale } = useTranslations();
  const formatted = formatKoins(amount, locale);

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--brand-navy)] bg-[var(--brand-yellow)] px-3.5 py-1.5 shadow-[3px_3px_0_rgba(20,23,77,0.85)]"
      aria-label={t("profile.koinsBalance", { amount: formatted })}
    >
      <KoinIcon className="h-5 w-5 shrink-0" />
      <span
        className={`${brandTitleFont.className} text-sm font-extrabold uppercase tracking-wide text-[var(--brand-navy)] sm:text-base`}
      >
        {formatted}
      </span>
      <span
        className={`${brandBodyFont.className} text-xs font-bold uppercase tracking-wide text-[var(--brand-navy)]/70`}
      >
        {t("profile.koinsLabel")}
      </span>
    </div>
  );
}

function ModalShell({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslations();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a24]/70 px-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${brandBodyFont.className} rounded-xl border-2 border-[var(--brand-navy)] bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-[2px_2px_0_var(--brand-navy)] transition-[transform,box-shadow] duration-150 hover:brightness-95 active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--brand-navy)]`}
            aria-label={closeLabel}
          >
            {t("profile.close")}
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function WalletModal({
  address,
  onClose,
}: {
  address: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslations();
  const [copied, setCopied] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[] | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState(false);

  useEffect(() => {
    if (!address) {
      setBalances(null);
      setBalancesLoading(false);
      setBalancesError(false);
      return;
    }

    let cancelled = false;

    const loadBalances = async () => {
      setBalancesLoading(true);
      setBalancesError(false);
      try {
        const next = await fetchCeloTokenBalances(address);
        if (!cancelled) setBalances(next);
      } catch {
        if (!cancelled) {
          setBalances(null);
          setBalancesError(true);
        }
      } finally {
        if (!cancelled) setBalancesLoading(false);
      }
    };

    void loadBalances();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ModalShell
      title={t("profile.wallet")}
      closeLabel={t("profile.closeWallet")}
      onClose={onClose}
    >
      {address ? (
        <>
          {balancesLoading ? (
            <p className={`${brandBodyFont.className} mb-5 text-sm opacity-70`}>
              {t("profile.loadingBalances")}
            </p>
          ) : balancesError ? (
            <p
              className={`${brandBodyFont.className} mb-5 text-sm font-semibold text-[var(--brand-coral)]`}
            >
              {t("profile.errorBalances")}
            </p>
          ) : balances ? (
            <div className="mb-5 grid grid-cols-2 gap-3">
              {balances.map((token) => (
                <div key={token.symbol} className="flex flex-col items-center">
                  <div className="flex w-full items-center justify-center rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(165deg,#2ECC71_0%,#1B8A4A_100%)] px-3 py-4 shadow-[3px_3px_0_var(--brand-navy)]">
                    <span className="font-mono text-base font-semibold tabular-nums text-white">
                      {token.formatted}
                    </span>
                  </div>
                  <span
                    className={`${brandTitleFont.className} mt-2 text-xs font-extrabold uppercase tracking-wide opacity-70`}
                  >
                    {token.symbol}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <p
              className={`${brandTitleFont.className} mb-2 text-xs font-extrabold uppercase tracking-wide opacity-70`}
            >
              {t("profile.address")}
            </p>
            <div className="flex items-center gap-2 rounded-2xl border-[3px] border-[var(--brand-navy)] bg-white px-3 py-2.5 shadow-[inset_2px_2px_0_rgba(20,23,77,0.08)]">
              <p className="min-w-0 flex-1 break-all font-mono text-[0.8rem] leading-relaxed tracking-tight">
                {address}
              </p>
              <button
                type="button"
                onClick={() => void copyAddress()}
                className={`shrink-0 rounded-xl border-2 border-[var(--brand-navy)] p-2 transition-[transform,box-shadow,background-color] duration-150 ${
                  copied
                    ? "bg-[var(--brand-mint)] text-white shadow-[2px_2px_0_var(--brand-navy)]"
                    : "bg-[var(--brand-cream)] text-[var(--brand-navy)] shadow-[2px_2px_0_var(--brand-navy)] hover:brightness-95 active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--brand-navy)]"
                }`}
                aria-label={copied ? t("profile.copied") : t("profile.copy")}
                title={copied ? t("profile.copied") : t("profile.copy")}
              >
                {copied ? (
                  <FaCheck className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <FaCopy className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className={`${brandBodyFont.className} text-sm opacity-70`}>
          {t("profile.creatingWallet")}
        </p>
      )}
    </ModalShell>
  );
}

function SettingsModal({
  language,
  onLanguageChange,
  onClose,
}: {
  language: LanguageOption;
  onLanguageChange: (value: LanguageOption) => void;
  onClose: () => void;
}) {
  const { t } = useTranslations();

  return (
    <ModalShell
      title={t("profile.settings")}
      closeLabel={t("profile.closeSettings")}
      onClose={onClose}
    >
      <label
        htmlFor="settings-language"
        className={`${brandTitleFont.className} mb-2 block text-xs font-extrabold uppercase tracking-wide opacity-70`}
      >
        {t("profile.language")}
      </label>
      <select
        id="settings-language"
        value={language}
        onChange={(event) =>
          onLanguageChange(event.target.value as LanguageOption)
        }
        className={`${brandBodyFont.className} w-full rounded-2xl border-[3px] border-[var(--brand-navy)] bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-navy)] outline-none shadow-[3px_3px_0_var(--brand-navy)] focus:brightness-95`}
      >
        <option value="ENGLISH">{t("profile.languageEnglish")}</option>
        <option value="ESPAÑOL">{t("profile.languageSpanish")}</option>
      </select>
    </ModalShell>
  );
}

function ProfileGate() {
  const { t } = useTranslations();
  const { ready, isMiniPay } = useAppAuth();

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p
          className={`${brandTitleFont.className} text-sm font-extrabold uppercase tracking-wide text-[var(--brand-cream)]/70`}
        >
          {t("profile.loading")}
        </p>
      </main>
    );
  }

  if (!isMiniPay && !process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1
          className={`${brandTitleFont.className} text-2xl font-extrabold tracking-wide text-[var(--brand-cream)]`}
          style={{ textShadow: "0 3px 0 rgba(20,23,77,0.65)" }}
        >
          {t("profile.title")}
        </h1>
        <p
          className={`${brandBodyFont.className} max-w-md text-sm leading-relaxed text-[var(--brand-cream)]/80`}
        >
          {t("profile.missingPrivy", {
            privyAppId: "NEXT_PUBLIC_PRIVY_APP_ID",
            privySecret: "PRIVY_APP_SECRET",
            envFile: ".env.local",
          })
            .split(/(NEXT_PUBLIC_PRIVY_APP_ID|PRIVY_APP_SECRET|\.env\.local)/)
            .map((part, index) =>
              part === "NEXT_PUBLIC_PRIVY_APP_ID" ||
              part === "PRIVY_APP_SECRET" ||
              part === ".env.local" ? (
                <code
                  key={`${part}-${index}`}
                  className={
                    part === ".env.local"
                      ? undefined
                      : "text-[var(--brand-mint)]"
                  }
                >
                  {part}
                </code>
              ) : (
                <span key={`${part}-${index}`}>{part}</span>
              ),
            )}
        </p>
      </main>
    );
  }

  return <ProfileAuthenticatedView />;
}

function ProfileAuthenticatedView() {
  const {
    ready,
    authenticated,
    walletAddress,
    email,
    logout,
    getAccessToken,
    isMiniPay,
    miniPayError,
    loginWithEmail,
    refreshMiniPayProfile,
  } = useAppAuth();
  const { t } = useTranslations();
  const { locale, setLocale } = useLocale();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorFallback, setErrorFallback] = useState<string | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectWalletOpen, setConnectWalletOpen] = useState(false);

  const language = localeToLanguageOption(locale);

  const resolveApiError = useCallback(
    (error: string | undefined, fallbackKey: MessageKey) => {
      const mapped = mapApiErrorToMessageKey(error);
      if (mapped) {
        setErrorKey(mapped);
        setErrorFallback(null);
        return;
      }
      if (error) {
        setErrorKey(null);
        setErrorFallback(error);
        return;
      }
      setErrorKey(fallbackKey);
      setErrorFallback(null);
    },
    [],
  );

  const shortWallet = useMemo(() => {
    if (!walletAddress) return null;
    return `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;
  }, [walletAddress]);

  const fetchProfile = useCallback(async () => {
    if (!authenticated) {
      setProfile(null);
      return;
    }

    setLoadingProfile(true);
    setErrorKey(null);
    setErrorFallback(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorKey("profile.errorSession");
        return;
      }

      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as {
        profile?: Profile | null;
        error?: string;
      };

      if (!res.ok) {
        resolveApiError(json.error, "profile.errorLoad");
        return;
      }

      setProfile(json.profile ?? null);
      if (json.profile?.username) {
        setUsername(json.profile.username);
      }
    } catch {
      setErrorKey("profile.errorLoad");
    } finally {
      setLoadingProfile(false);
    }
  }, [authenticated, getAccessToken, resolveApiError]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      setErrorKey(validationError);
      setErrorFallback(null);
      return;
    }
    if (!walletAddress) {
      setErrorKey("profile.errorWalletPending");
      setErrorFallback(null);
      return;
    }

    setSaving(true);
    setErrorKey(null);
    setErrorFallback(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorKey("profile.errorSession");
        return;
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          email,
          username,
        }),
      });

      const json = (await res.json()) as {
        profile?: Profile;
        error?: string;
      };

      if (!res.ok || !json.profile) {
        resolveApiError(json.error, "profile.errorSave");
        return;
      }

      setProfile(json.profile);
      if (isMiniPay) {
        await refreshMiniPayProfile();
      }
    } catch {
      setErrorKey("profile.errorSave");
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (option: LanguageOption) => {
    setLocale(languageOptionToLocale(option));
  };

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p
          className={`${brandTitleFont.className} text-sm font-extrabold uppercase tracking-wide text-[var(--brand-cream)]/70`}
        >
          {isMiniPay
            ? t("profile.connectingMiniPay")
            : t("profile.loading")}
        </p>
      </main>
    );
  }

  if (!authenticated) {
    if (isMiniPay) {
      return (
        <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
            <ProfileAvatar />
            <div className="space-y-2">
              <h1
                className={`${brandTitleFont.className} text-[1.85rem] font-extrabold leading-none tracking-wide text-[var(--brand-cream)] sm:text-[2.1rem]`}
                style={{ textShadow: "0 3px 0 rgba(20,23,77,0.65)" }}
              >
                {t("profile.title")}
              </h1>
              <p
                className={`${brandBodyFont.className} mx-auto max-w-sm text-sm leading-relaxed font-semibold text-[var(--brand-cream)]/75`}
              >
                {miniPayError
                  ? t("profile.errorMiniPayConnect")
                  : t("profile.connectingMiniPay")}
              </p>
              {miniPayError ? (
                <p
                  className={`${brandBodyFont.className} text-sm font-semibold text-[var(--brand-coral)]`}
                  role="alert"
                >
                  {miniPayError}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`${brandBackButtonClassName} w-[min(100%,16.5rem)] min-w-0 gap-2 px-3 text-sm leading-none sm:w-[17.5rem] sm:gap-2.5 sm:px-4 sm:text-base`}
            >
              <FaGear className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              <span className="whitespace-nowrap">{t("profile.settings")}</span>
            </button>
          </div>
          {settingsOpen ? (
            <SettingsModal
              language={language}
              onLanguageChange={handleLanguageChange}
              onClose={() => setSettingsOpen(false)}
            />
          ) : null}
        </main>
      );
    }

    return (
      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
          <ProfileAvatar />

          <div className="space-y-2">
            <h1
              className={`${brandTitleFont.className} text-[1.85rem] font-extrabold leading-none tracking-wide text-[var(--brand-cream)] sm:text-[2.1rem]`}
              style={{ textShadow: "0 3px 0 rgba(20,23,77,0.65)" }}
            >
              {t("profile.title")}
            </h1>
            <p
              className={`${brandBodyFont.className} mx-auto max-w-sm text-sm leading-relaxed font-semibold text-[var(--brand-cream)]/75 sm:text-[0.95rem]`}
            >
              {t("profile.signInBlurb")}
            </p>
          </div>

          <div className="flex w-[min(100%,16.5rem)] flex-col items-center gap-3 sm:w-[17.5rem]">
            <button
              type="button"
              onClick={() => loginWithEmail?.()}
              className={`${brandPlayButtonClassName} w-full min-w-0 px-3 text-sm leading-none sm:px-4 sm:text-base`}
            >
              <span className="whitespace-nowrap">{t("profile.signIn")}</span>
            </button>
            <p
              className={`${brandTitleFont.className} text-xs font-extrabold uppercase tracking-wide text-[var(--brand-cream)]/45`}
            >
              {t("profile.signInOr")}
            </p>
            <button
              type="button"
              onClick={() => setConnectWalletOpen(true)}
              className={`${brandSecondaryButtonClassName} w-full min-w-0 gap-2 px-2.5 text-sm leading-none sm:gap-2.5 sm:px-3.5 sm:text-base`}
            >
              <FaWallet className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              <span className="whitespace-nowrap">
                {t("profile.signInWithWallet")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`${brandBackButtonClassName} w-full min-w-0 gap-2 px-3 text-sm leading-none sm:gap-2.5 sm:px-4 sm:text-base`}
            >
              <FaGear className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              <span className="whitespace-nowrap">{t("profile.settings")}</span>
            </button>
          </div>
        </div>

        {connectWalletOpen ? (
          <ConnectWalletModal onClose={() => setConnectWalletOpen(false)} />
        ) : null}

        {settingsOpen ? (
          <SettingsModal
            language={language}
            onLanguageChange={handleLanguageChange}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </main>
    );
  }

  const needsUsername = !profile?.username;
  const errorMessage = errorKey ? t(errorKey) : errorFallback;

  return (
    <main className="relative mx-auto flex w-full min-h-0 flex-1 flex-col overflow-y-auto">
      {loadingProfile ? (
        <div className="relative flex flex-1 items-center justify-center px-6">
          <p
            className={`${brandTitleFont.className} text-sm font-extrabold uppercase tracking-wide text-[var(--brand-cream)]/70`}
          >
            {t("profile.loadingProfile")}
          </p>
        </div>
      ) : needsUsername ? (
        <section className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-8 text-center">
          <ProfileAvatar size="md" />
          <div className="space-y-2">
            <h2
              className={`${brandTitleFont.className} text-[1.55rem] font-extrabold leading-none tracking-wide text-[var(--brand-cream)] sm:text-[1.75rem]`}
              style={{ textShadow: "0 3px 0 rgba(20,23,77,0.65)" }}
            >
              {t("profile.chooseUsername")}
            </h2>
            <p
              className={`${brandBodyFont.className} text-sm font-semibold text-[var(--brand-cream)]/75`}
            >
              {isMiniPay
                ? t("profile.miniPayReadyBlurb")
                : t("profile.usernameHint")}
            </p>
            {shortWallet ? (
              <p className="font-mono text-xs text-[var(--brand-cream)]/45">
                {shortWallet}
              </p>
            ) : (
              <p
                className={`${brandBodyFont.className} text-xs text-[var(--brand-cream)]/45`}
              >
                {t("profile.creatingWallet")}
              </p>
            )}
          </div>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("profile.usernamePlaceholder")}
            maxLength={20}
            className={`${brandBodyFont.className} w-full rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] px-4 py-3.5 text-center text-base font-semibold text-[var(--brand-navy)] outline-none shadow-[4px_4px_0_rgba(20,23,77,0.85)] placeholder:text-[var(--brand-navy)]/35 focus:brightness-95`}
            autoComplete="username"
          />
          <button
            type="button"
            disabled={saving || !walletAddress}
            onClick={() => void saveProfile()}
            className={`${brandPlayButtonClassName} w-full min-w-0`}
          >
            {saving ? t("profile.saving") : t("profile.createProfile")}
          </button>
          {!isMiniPay ? (
            <button
              type="button"
              onClick={() => void logout()}
              className={`${brandBackButtonClassName} w-full min-w-0 text-sm sm:text-base`}
            >
              {t("profile.signOut")}
            </button>
          ) : null}
        </section>
      ) : (
        <section className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 py-8 text-center">
          <ProfileAvatar />

          <div className="space-y-1.5">
            <p
              className={`${brandTitleFont.className} text-[1.75rem] font-extrabold leading-none tracking-wide text-[var(--brand-cream)] sm:text-[2rem]`}
              style={{ textShadow: "0 3px 0 rgba(20,23,77,0.65)" }}
            >
              @{profile?.username}
            </p>
            {email ? (
              <p
                className={`${brandBodyFont.className} text-sm font-semibold text-[var(--brand-cream)]/55`}
              >
                {email}
              </p>
            ) : shortWallet ? (
              <p className="font-mono text-xs text-[var(--brand-cream)]/45">
                {shortWallet}
              </p>
            ) : null}
          </div>

          <KoinBalanceBadge amount={profile?.koins ?? 0} />

          <div className="mt-1 flex w-[min(100%,16rem)] flex-col gap-3 sm:w-[17rem]">
            <button
              type="button"
              onClick={() => setWalletOpen(true)}
              className={`${brandSecondaryButtonClassName} w-full min-w-0 gap-2.5 px-3 text-base leading-none sm:px-5`}
            >
              <FaWallet className="h-5 w-5 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t("profile.wallet")}</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`${brandPlayButtonClassName} w-full min-w-0 gap-2.5 px-3 text-base leading-none sm:px-5`}
            >
              <FaGear className="h-5 w-5 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t("profile.settings")}</span>
            </button>
            {!isMiniPay ? (
              <button
                type="button"
                onClick={() => void logout()}
                className={`${brandBackButtonClassName} w-full min-w-0 text-sm sm:text-base`}
              >
                {t("profile.signOut")}
              </button>
            ) : null}
          </div>
        </section>
      )}

      {errorMessage ? (
        <p
          className={`${brandBodyFont.className} relative mt-2 px-6 pb-4 text-center text-sm font-semibold text-[var(--brand-coral)]`}
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {walletOpen ? (
        <WalletModal
          address={walletAddress}
          onClose={() => setWalletOpen(false)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          language={language}
          onLanguageChange={handleLanguageChange}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </main>
  );
}

export function ProfileView() {
  return <ProfileGate />;
}
