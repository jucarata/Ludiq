"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAppAuth } from "@/lib/auth/useAppAuth";
import { DiceWaitScreen } from "@/components/multiplayer/DiceWaitScreen";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  brandTitleFont,
  retroBackButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";
import type { Profile } from "@/lib/profile/types";

type GateStatus = "loading" | "allowed" | "blocked";

function hasPlayableProfile(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.username && profile?.wallet_address);
}

/**
 * Friends mode requires an authenticated profile with a linked wallet
 * so Party pot payouts can always reach a winner.
 */
export function FriendsAuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const { ready, authenticated, getAccessToken } = useAppAuth();
  const [status, setStatus] = useState<GateStatus>("loading");

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    void (async () => {
      if (!authenticated) {
        if (!cancelled) setStatus("blocked");
        return;
      }

      if (!cancelled) setStatus("loading");

      try {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) setStatus("blocked");
          return;
        }

        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setStatus("blocked");
          return;
        }

        const data = (await res.json()) as { profile: Profile | null };
        if (!cancelled) {
          setStatus(hasPlayableProfile(data.profile) ? "allowed" : "blocked");
        }
      } catch {
        if (!cancelled) setStatus("blocked");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  if (status === "loading") {
    return <DiceWaitScreen title={t("multiplayer.checkingAuth")} />;
  }

  if (status === "blocked") {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className={`${brandTitleFont.className} text-4xl font-extrabold tracking-wide text-[var(--brand-cream)] sm:text-5xl`}
          >
            {t("multiplayer.title")}
          </h1>
          <p className="max-w-md text-sm text-[var(--board-path-border)]">
            {t("multiplayer.authRequired")}
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <Link
            href="/profile"
            className={`${retroPlayButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.goToProfile")}
          >
            {t("multiplayer.goToProfile")}
          </Link>
          <Link
            href="/"
            className={`${retroBackButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.back")}
          >
            {t("multiplayer.back")}
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
