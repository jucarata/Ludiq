"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FriendsAuthGate } from "@/components/multiplayer/FriendsAuthGate";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  brandSecondaryButtonClassName,
  brandTitleFont,
  retroBackButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";

export function MultiplayerHub() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [closedNotice, setClosedNotice] = useState(false);
  const [kickedNotice, setKickedNotice] = useState(false);

  useEffect(() => {
    const closed = searchParams.get("closed") === "1";
    const kicked = searchParams.get("kicked") === "1";
    if (!closed && !kicked) return;

    if (closed) {
      setClosedNotice(true);
      setKickedNotice(false);
    } else {
      setKickedNotice(true);
      setClosedNotice(false);
    }
    router.replace("/friends", { scroll: false });
  }, [searchParams, router]);

  return (
    <FriendsAuthGate>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className={`${brandTitleFont.className} text-4xl font-extrabold tracking-wide text-[var(--brand-cream)] sm:text-5xl`}
          >
            {t("multiplayer.title")}
          </h1>
          <p className="max-w-md text-sm text-[var(--board-path-border)]">
            {t("multiplayer.subtitle")}
          </p>
          {closedNotice ? (
            <p className="max-w-md text-sm text-[var(--board-red)]">
              {t("multiplayer.roomClosed")}
            </p>
          ) : null}
          {kickedNotice ? (
            <p className="max-w-md text-sm text-[var(--board-red)]">
              {t("multiplayer.roomKicked")}
            </p>
          ) : null}
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <Link
            href="/friends/create"
            className={`${retroPlayButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.createRoom")}
          >
            {t("multiplayer.createRoom")}
          </Link>
          <Link
            href="/friends/join"
            className={`${brandSecondaryButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.joinRoom")}
          >
            {t("multiplayer.joinRoom")}
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
    </FriendsAuthGate>
  );
}
