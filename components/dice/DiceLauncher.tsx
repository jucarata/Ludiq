"use client";

import { useDice } from "@/components/dice/DiceContext";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { useGameState } from "@/components/game/GameStateContext";
import { useTurn } from "@/components/game/TurnContext";
import { useIsBot } from "@/components/game/PlayersContext";
import { DieFace } from "@/components/dice/DieFace";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { getPlayerColorLabel } from "@/lib/i18n";
import { hasAnyPieceOnRoute } from "@/lib/game/pieces";

const SHELL =
  "mb-4 flex h-[12rem] shrink-0 flex-col items-center justify-center gap-2 md:h-[13rem]";
const CARD =
  "flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-3";
const DIE = "h-12 w-12 md:h-14 md:w-14";
const BANNER_SLOT = "flex h-8 w-full shrink-0 items-center justify-center";

export function DiceLauncher() {
  const { currentPlayer } = useTurn();
  const isBot = useIsBot();
  const { isAutoEnabled } = useAutoMode();
  const { pieces } = useGameState();
  const { t, locale } = useTranslations();
  const {
    isAiming,
    isRolling,
    canRoll,
    hasRolledThisTurn,
    exitRollAttempts,
    maxExitRollAttempts,
    turnRoll,
    armDice,
    cancelAim,
  } = useDice();

  const label = getPlayerColorLabel(locale, currentPlayer);
  const currentIsBot = isBot(currentPlayer);
  const currentIsAutoHuman =
    !currentIsBot && isAutoEnabled(currentPlayer);
  const needsExitDoubles = !hasAnyPieceOnRoute(pieces, currentPlayer);
  const attemptNumber = Math.min(
    exitRollAttempts + 1,
    maxExitRollAttempts,
  );
  const showExitAttempts = needsExitDoubles && !hasRolledThisTurn;
  const showRollResult =
    turnRoll !== null && (hasRolledThisTurn || (!canRoll && !isRolling));
  const showNoDoublesBanner =
    showExitAttempts && turnRoll !== null && exitRollAttempts > 0;

  const exitAttemptLine = showExitAttempts ? (
    <span className="text-[10px] font-medium text-[#d4c5a0]/80">
      {t("dice.exitAttempt", {
        current: attemptNumber,
        max: maxExitRollAttempts,
      })}
    </span>
  ) : null;

  const statusCard = (message: string, extra?: React.ReactNode) => (
    <div className={SHELL}>
      <div className={BANNER_SLOT} aria-hidden />
      <div className={CARD}>
        <div className="flex items-center gap-2" aria-hidden>
          <DieFace value={3} className={`${DIE} opacity-60`} />
          <DieFace value={5} className={`${DIE} opacity-60`} />
        </div>
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[#457b9d]">
          {message}
        </span>
        {extra}
      </div>
      <p className="min-h-[1rem] text-center text-xs invisible" aria-hidden>
        {t("dice.tapToRoll")}
      </p>
    </div>
  );

  if (isRolling && !canRoll && !hasRolledThisTurn) {
    return statusCard(t("dice.rolling"));
  }

  if (showRollResult && turnRoll) {
    return (
      <div className={SHELL}>
        <div className={BANNER_SLOT} aria-hidden />
        <div
          className={`${CARD} flex-row gap-3 md:gap-4`}
          aria-label={t("dice.rolled", {
            label,
            d1: turnRoll[0],
            d2: turnRoll[1],
          })}
        >
          <span className="font-mono text-4xl font-black tabular-nums text-[#fcd34d] drop-shadow-[0_0_14px_rgba(252,211,77,0.55)] md:text-5xl">
            {turnRoll[0]}
          </span>
          <span className="text-xl font-bold text-[#d4c5a0]/80 md:text-2xl">+</span>
          <span className="font-mono text-4xl font-black tabular-nums text-[#fcd34d] drop-shadow-[0_0_14px_rgba(252,211,77,0.55)] md:text-5xl">
            {turnRoll[1]}
          </span>
        </div>
        <p className="min-h-[1rem] text-center text-xs invisible" aria-hidden>
          {t("dice.tapToRoll")}
        </p>
      </div>
    );
  }

  if (!canRoll && !currentIsBot && !currentIsAutoHuman) {
    return statusCard(t("room.waitingTurn", { label }), exitAttemptLine);
  }

  if (currentIsBot || currentIsAutoHuman) {
    return statusCard(
      isRolling
        ? t("dice.rolling")
        : currentIsBot
          ? t("dice.cpuTurn")
          : t("dice.autoMode"),
      exitAttemptLine,
    );
  }

  return (
    <div className={SHELL}>
      <div className={BANNER_SLOT}>
        {showNoDoublesBanner && turnRoll ? (
          <div
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a1a2e]/80 px-3 py-1"
            aria-label={t("dice.rolled", {
              label,
              d1: turnRoll[0],
              d2: turnRoll[1],
            })}
          >
            <span className="font-mono text-lg font-bold tabular-nums text-[#fcd34d]/80">
              {turnRoll[0]}
            </span>
            <span className="text-sm text-[#d4c5a0]/60">+</span>
            <span className="font-mono text-lg font-bold tabular-nums text-[#fcd34d]/80">
              {turnRoll[1]}
            </span>
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-[#e07a5f]">
              {t("dice.noDoubles")}
            </span>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={isAiming ? cancelAim : armDice}
        disabled={!canRoll || isRolling}
        className={`flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all ${
          isAiming
            ? "bg-[#353550] ring-2 ring-[#fcd34d] ring-offset-2 ring-offset-[#2a2a3e]"
            : "bg-[#1a1a2e] hover:bg-[#252540] disabled:cursor-not-allowed disabled:opacity-50"
        }`}
        aria-pressed={isAiming}
        aria-label={
          isAiming
            ? t("dice.cancelRoll")
            : t("dice.rollTurn", { label })
        }
      >
        <div className="flex items-center gap-2" aria-hidden>
          <DieFace value={3} className={DIE} />
          <DieFace value={5} className={DIE} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-[#d4c5a0]">
          {isAiming ? t("dice.cancel") : t("dice.rollDice")}
        </span>
        {showExitAttempts && (
          <span className="text-[10px] font-medium normal-case tracking-normal text-[#fefae0]/70">
            {t("dice.exitAttempt", {
              current: attemptNumber,
              max: maxExitRollAttempts,
            })}
          </span>
        )}
      </button>
      <p
        className={`min-h-[1rem] text-center text-xs text-[#fefae0]/70 ${
          isAiming ? "visible" : "invisible"
        }`}
      >
        {t("dice.tapToRoll")}
      </p>
    </div>
  );
}
