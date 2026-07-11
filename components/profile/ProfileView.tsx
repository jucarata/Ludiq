"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { FaCheck, FaCopy, FaGear, FaWallet } from "react-icons/fa6";
import { useLocale, useTranslations } from "@/components/i18n/LocaleProvider";
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
  retroActionFont,
  retroPlayButtonClassName,
} from "@/lib/fonts";
import {
  fetchCeloTokenBalances,
  type TokenBalance,
} from "@/lib/celo/tokens";

function ProfileAvatar() {
  return (
    <div
      className="flex h-36 w-36 items-center justify-center rounded-full border-[4px] border-[#173532] bg-[var(--board-green)] shadow-[4px_4px_0_#173532] sm:h-40 sm:w-40"
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-[70%] w-[70%]">
        {/* body */}
        <ellipse cx="32" cy="46" rx="14" ry="12" fill="#fefae0" />
        {/* head */}
        <circle cx="32" cy="24" r="14" fill="#fefae0" />
        {/* eyes */}
        <circle cx="27" cy="23" r="2.2" fill="#173532" />
        <circle cx="37" cy="23" r="2.2" fill="#173532" />
        {/* smile */}
        <path
          d="M26 29c2.2 2.4 9.8 2.4 12 0"
          fill="none"
          stroke="#173532"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* cheeks */}
        <circle cx="22.5" cy="27" r="2" fill="#e63946" opacity="0.35" />
        <circle cx="41.5" cy="27" r="2" fill="#e63946" opacity="0.35" />
      </svg>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-5"
      role="dialog"
      aria-modal="true"
      aria-label={t("profile.wallet")}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] p-5 text-[#173532] shadow-[6px_6px_0_#173532]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={`${retroActionFont.className} text-[0.65rem]`}>
            {t("profile.wallet")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-[#173532] px-2 py-1 text-xs font-semibold uppercase"
            aria-label={t("profile.closeWallet")}
          >
            {t("profile.close")}
          </button>
        </div>

        {address ? (
          <>
            {balancesLoading ? (
              <p className="mb-5 text-sm opacity-70">
                {t("profile.loadingBalances")}
              </p>
            ) : balancesError ? (
              <p className="mb-5 text-sm text-[var(--board-red)]">
                {t("profile.errorBalances")}
              </p>
            ) : balances ? (
              <div className="mb-5 grid grid-cols-2 gap-3">
                {balances.map((token) => (
                  <div key={token.symbol} className="flex flex-col items-center">
                    <div className="flex w-full items-center justify-center rounded-xl border-[3px] border-[#173532] bg-[var(--board-green)] px-3 py-4 shadow-[3px_3px_0_#173532]">
                      <span className="font-mono text-base font-semibold tabular-nums text-[var(--board-path)]">
                        {token.formatted}
                      </span>
                    </div>
                    <span className="mt-2 text-xs font-semibold tracking-wide opacity-70">
                      {token.symbol}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide">
                {t("profile.address")}
              </p>
              <div className="flex items-center gap-2 rounded-xl border-[3px] border-[#173532] bg-[#fefae0]/55 px-3 py-2.5 shadow-[inset_2px_2px_0_rgba(23,53,50,0.12)]">
                <p className="min-w-0 flex-1 break-all font-mono text-[0.8rem] leading-relaxed tracking-tight">
                  {address}
                </p>
                <button
                  type="button"
                  onClick={() => void copyAddress()}
                  className={`shrink-0 rounded-lg border-2 border-[#173532] p-2 transition-[transform,box-shadow,background-color] duration-150 ${
                    copied
                      ? "bg-[var(--board-green)] text-[var(--board-path)] shadow-[2px_2px_0_#173532]"
                      : "bg-[var(--board-path)] text-[#173532] shadow-[2px_2px_0_#173532] hover:brightness-95 active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_#173532]"
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
          <p className="text-sm opacity-70">{t("profile.creatingWallet")}</p>
        )}
      </div>
    </div>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-5"
      role="dialog"
      aria-modal="true"
      aria-label={t("profile.settings")}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] p-5 text-[#173532] shadow-[6px_6px_0_#173532]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={`${retroActionFont.className} text-[0.65rem]`}>
            {t("profile.settings")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-[#173532] px-2 py-1 text-xs font-semibold uppercase"
            aria-label={t("profile.closeSettings")}
          >
            {t("profile.close")}
          </button>
        </div>

        <label
          htmlFor="settings-language"
          className="mb-2 block text-xs uppercase tracking-wide opacity-60"
        >
          {t("profile.language")}
        </label>
        <select
          id="settings-language"
          value={language}
          onChange={(event) =>
            onLanguageChange(event.target.value as LanguageOption)
          }
          className="w-full rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] px-4 py-3 text-sm text-[#173532] outline-none focus:brightness-95"
        >
          <option value="ENGLISH">{t("profile.languageEnglish")}</option>
          <option value="ESPAÑOL">{t("profile.languageSpanish")}</option>
        </select>
      </div>
    </div>
  );
}

function ProfileGate() {
  const { t } = useTranslations();

  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className={`${retroActionFont.className} text-sm sm:text-base`}>
          {t("profile.title")}
        </h1>
        <p className="max-w-md text-sm text-[var(--board-path)]/80">
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
                    part === ".env.local" ? undefined : "text-[var(--board-green)]"
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
  const { ready, authenticated, user, login, logout, getAccessToken } =
    usePrivy();
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

  const walletAddress = useMemo(() => {
    const embedded = user?.wallet?.address;
    if (embedded) return embedded;
    const linked = user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && "address" in account,
    );
    if (linked && "address" in linked) return linked.address as string;
    return null;
  }, [user]);

  const email = user?.email?.address ?? user?.google?.email ?? null;

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
          className={`${retroActionFont.className} text-xs text-[var(--board-path)]/70`}
        >
          {t("profile.loading")}
        </p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-3">
          <h1 className={`${retroActionFont.className} text-sm sm:text-base`}>
            {t("profile.title")}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--board-path)]/80">
            {t("profile.signInBlurb")}
          </p>
        </div>
        <div className="flex w-[min(100%,15rem)] flex-col items-center gap-3 sm:w-[16rem]">
          <button
            type="button"
            onClick={login}
            className={`${retroPlayButtonClassName} w-full min-w-0`}
          >
            {t("profile.signIn")}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`${retroPlayButtonClassName} w-full min-w-0 gap-2 px-3 text-[0.65rem] leading-none sm:gap-3 sm:px-5 sm:text-xs`}
          >
            <FaGear className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
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

  const needsUsername = !profile?.username;
  const errorMessage = errorKey
    ? t(errorKey)
    : errorFallback;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-6 py-8">
      {loadingProfile ? (
        <div className="flex flex-1 items-center justify-center">
          <p
            className={`${retroActionFont.className} text-[0.55rem] opacity-70`}
          >
            {t("profile.loadingProfile")}
          </p>
        </div>
      ) : needsUsername ? (
        <section className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 text-center">
          <ProfileAvatar />
          <div className="space-y-2">
            <h2 className={`${retroActionFont.className} text-[0.65rem]`}>
              {t("profile.chooseUsername")}
            </h2>
            <p className="text-sm text-[var(--board-path)]/75">
              {t("profile.usernameHint")}
            </p>
          </div>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("profile.usernamePlaceholder")}
            maxLength={20}
            className="w-full rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] px-4 py-3 text-center text-[#173532] outline-none focus:brightness-95"
            autoComplete="username"
          />
          <button
            type="button"
            disabled={saving || !walletAddress}
            onClick={() => void saveProfile()}
            className={retroPlayButtonClassName}
          >
            {saving ? t("profile.saving") : t("profile.createProfile")}
          </button>
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <ProfileAvatar />
          <div className="space-y-1.5">
            <p className={`${retroActionFont.className} text-xs sm:text-sm`}>
              @{profile?.username}
            </p>
            {email ? (
              <p className="text-xs text-[var(--board-path)]/45 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
                {email}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void logout()}
              className={`${retroActionFont.className} flex h-10 min-w-[7.5rem] items-center justify-center rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] px-5 text-[0.5rem] uppercase tracking-normal text-[#173532] shadow-[3px_3px_0_#173532] transition-[transform,box-shadow,filter] duration-150 hover:brightness-95 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] sm:h-11 sm:min-w-[8.5rem] sm:px-6 sm:text-[0.55rem]`}
            >
              {t("profile.signOut")}
            </button>
            <div className="mt-4 flex w-[min(100%,15rem)] flex-col gap-3 sm:w-[16rem]">
              <button
                type="button"
                onClick={() => setWalletOpen(true)}
                className={`${retroPlayButtonClassName} w-full min-w-0 gap-2 px-3 text-[0.65rem] leading-none sm:gap-3 sm:px-5 sm:text-xs`}
              >
                <FaWallet className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
                <span className="whitespace-nowrap">{t("profile.wallet")}</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className={`${retroPlayButtonClassName} w-full min-w-0 gap-2 px-3 text-[0.65rem] leading-none sm:gap-3 sm:px-5 sm:text-xs`}
              >
                <FaGear className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
                <span className="whitespace-nowrap">{t("profile.settings")}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {errorMessage ? (
        <p className="mt-4 text-center text-sm text-[var(--board-red)]" role="alert">
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
