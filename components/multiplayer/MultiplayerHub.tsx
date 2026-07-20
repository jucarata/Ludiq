"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { FaDice } from "react-icons/fa6";
import { GiCrossedSwords } from "react-icons/gi";
import { DiceWaitScreen } from "@/components/multiplayer/DiceWaitScreen";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  retroActionFont,
  retroBackButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";
import { parseRoomMode } from "@/lib/room/mode";

const modeCardClassName =
  "flex aspect-[3/4] w-full flex-col items-center justify-center gap-4 rounded-2xl border-[3px] border-[#173532] bg-[var(--board-green)] px-3 py-6 text-center text-[var(--board-path)] shadow-[4px_4px_0_#173532] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532]";

export function MultiplayerHub() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated } = usePrivy();
  const [closedNotice, setClosedNotice] = useState(false);
  const [kickedNotice, setKickedNotice] = useState(false);
  const modeParam = searchParams.get("mode");
  const isFreePlay = modeParam === "free";
  const isCompetitive = modeParam === "competitive";

  useEffect(() => {
    const closed = searchParams.get("closed") === "1";
    const kicked = searchParams.get("kicked") === "1";
    if (!closed && !kicked) return;

    const currentMode = parseRoomMode(searchParams.get("mode"));
    if (closed) {
      setClosedNotice(true);
      setKickedNotice(false);
    } else {
      setKickedNotice(true);
      setClosedNotice(false);
    }
    router.replace(`/multiplayer?mode=${currentMode}`, { scroll: false });
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
          {kickedNotice ? (
            <p className="max-w-md text-sm text-[var(--board-red)]">
              {t("multiplayer.roomKicked")}
            </p>
          ) : null}
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <Link
            href="/multiplayer/create?mode=free"
            className={`${retroPlayButtonClassName} w-full min-w-0`}
            aria-label={t("multiplayer.createRoom")}
          >
            {t("multiplayer.createRoom")}
          </Link>
          <Link
            href="/multiplayer/join?mode=free"
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

  if (isCompetitive) {
    if (!ready) {
      return <DiceWaitScreen title={t("multiplayer.checkingAuth")} />;
    }

    if (!authenticated) {
      return (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
              {t("multiplayer.competitive")}
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
            {t("multiplayer.competitive")}
          </h1>
          <p className="max-w-md text-sm text-[var(--board-path-border)]">
            {t("multiplayer.competitiveSubtitle")}
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
            href="/multiplayer/create?mode=competitive"
            className={`${retroPlayButtonClassName} h-auto min-h-14 w-full min-w-0 flex-col gap-0.5 py-2 leading-tight sm:min-h-[3.75rem]`}
            aria-label={`${t("multiplayer.createRoom")} ${t("multiplayer.createRoomPrice")}`}
          >
            <span>{t("multiplayer.createRoom")}</span>
            <span className="text-[0.65rem] normal-case tracking-wide text-[var(--board-path)]/90 sm:text-xs">
              {t("multiplayer.createRoomPrice")}
            </span>
          </Link>
          <Link
            href="/multiplayer/join?mode=competitive"
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
        <Link
          href="/multiplayer?mode=competitive"
          className={modeCardClassName}
          aria-label={t("multiplayer.competitive")}
        >
          <GiCrossedSwords className="h-14 w-14 sm:h-16 sm:w-16" aria-hidden />
          <span
            className={`${retroActionFont.className} text-[0.55rem] uppercase leading-tight sm:text-xs`}
          >
            {t("multiplayer.competitive")}
          </span>
        </Link>
        <Link
          href="/multiplayer?mode=free"
          className={modeCardClassName}
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
