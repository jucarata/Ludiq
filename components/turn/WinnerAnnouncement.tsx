"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useGameState } from "@/components/game/GameStateContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { getPlayerColorLabel } from "@/lib/i18n";
import { PLAYER_COLORS } from "@/lib/board/types";
import { playVictorySound } from "@/lib/game/sounds";
import { retroBackButtonClassName } from "@/lib/fonts";

/** Overlay persistente al terminar el juego: anuncia al ganador */
export function WinnerAnnouncement({
  menuHref = "/",
  onBackToMenu,
  prizeUsdt,
  trophiesAwarded,
}: {
  menuHref?: string;
  onBackToMenu?: () => void;
  /** Competitive pot paid to the winner (USDT). */
  prizeUsdt?: number | null;
  /** Competitive: trophies granted to the winner (1 × participant count). */
  trophiesAwarded?: number | null;
} = {}) {
  const { winner } = useGameState();
  const { t, locale } = useTranslations();

  useEffect(() => {
    if (winner) playVictorySound();
  }, [winner]);

  if (!winner) return null;

  const { fill, dark } = PLAYER_COLORS[winner];
  const label = getPlayerColorLabel(locale, winner);
  const showPrize =
    typeof prizeUsdt === "number" && Number.isFinite(prizeUsdt) && prizeUsdt > 0;
  const showTrophies =
    typeof trophiesAwarded === "number" &&
    Number.isFinite(trophiesAwarded) &&
    trophiesAwarded > 0;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 p-4"
      aria-live="assertive"
      role="status"
    >
      <div className="flex max-w-full flex-col items-center gap-4">
        <div
          className="rounded-2xl border-4 px-8 py-5 text-center shadow-2xl"
          style={{ borderColor: fill, backgroundColor: dark }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            {t("turn.gameOverWinner")}
          </p>
          <p
            className="mt-1 text-3xl font-black uppercase tracking-wide md:text-4xl"
            style={{ color: fill }}
          >
            {label}
          </p>
          {showPrize ? (
            <p className="mt-3 text-sm font-bold tracking-wide text-[#f5c518]">
              {t("turn.prizeWon", { amount: prizeUsdt.toFixed(2) })}
            </p>
          ) : null}
          {showTrophies ? (
            <p className="mt-2 text-sm font-bold tracking-wide text-[#e8c547]">
              {t("turn.trophiesWon", { count: trophiesAwarded })}
            </p>
          ) : null}
        </div>
        {onBackToMenu ? (
          <button
            type="button"
            className={retroBackButtonClassName}
            onClick={onBackToMenu}
          >
            {t("turn.backToMenu")}
          </button>
        ) : (
          <Link href={menuHref} className={retroBackButtonClassName}>
            {t("turn.backToMenu")}
          </Link>
        )}
      </div>
    </div>
  );
}
