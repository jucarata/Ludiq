"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FaDice } from "react-icons/fa6";
import { GiCrossedSwords } from "react-icons/gi";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  retroActionFont,
  retroBackButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";

const modeCardClassName =
  "flex aspect-[3/4] w-full flex-col items-center justify-center gap-4 rounded-2xl border-[3px] border-[#173532] bg-[var(--board-green)] px-3 py-6 text-center text-[var(--board-path)] shadow-[4px_4px_0_#173532] transition-[transform,box-shadow,filter] duration-150";

export function MultiplayerHub() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [closedNotice, setClosedNotice] = useState(false);
  const isFreePlay =
    searchParams.get("mode") === "free" || searchParams.get("closed") === "1";

  useEffect(() => {
    if (searchParams.get("closed") !== "1") return;
    setClosedNotice(true);
    router.replace("/multiplayer?mode=free", { scroll: false });
  }, [searchParams, router]);

  if (isFreePlay) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
            {t("multiplayer.freePlay")}
          </h1>
          <p className="max-w-md text-sm text-[var(--board-path-border)]">
            {t("multiplayer.freeSubtitle")}
          </p>
          {closedNotice ? (
            <p className="max-w-md text-sm text-[var(--board-red)]">
              {t("multiplayer.roomClosed")}
            </p>
          ) : null}
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <Link
            href="/multiplayer/create"
            className={`${retroPlayButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.createRoom")}
          >
            {t("multiplayer.createRoom")}
          </Link>
          <Link
            href="/multiplayer/join"
            className={`${retroPlayButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.joinRoom")}
          >
            {t("multiplayer.joinRoom")}
          </Link>
          <Link
            href="/multiplayer"
            className={`${retroBackButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.back")}
          >
            {t("multiplayer.back")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
          {t("multiplayer.title")}
        </h1>
        <p className="max-w-md text-sm text-[var(--board-path-border)]">
          {t("multiplayer.subtitle")}
        </p>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          className={modeCardClassName}
          aria-label={t("multiplayer.competitive")}
        >
          <GiCrossedSwords className="h-14 w-14 sm:h-16 sm:w-16" aria-hidden />
          <span
            className={`${retroActionFont.className} text-[0.55rem] uppercase leading-tight sm:text-xs`}
          >
            {t("multiplayer.competitive")}
          </span>
        </button>
        <Link
          href="/multiplayer?mode=free"
          className={`${modeCardClassName} hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532]`}
          aria-label={t("multiplayer.freePlay")}
        >
          <FaDice className="h-14 w-14 sm:h-16 sm:w-16" aria-hidden />
          <span
            className={`${retroActionFont.className} text-[0.55rem] uppercase leading-tight sm:text-xs`}
          >
            {t("multiplayer.freePlay")}
          </span>
        </Link>
      </div>
    </main>
  );
}
