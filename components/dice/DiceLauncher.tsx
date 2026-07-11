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

  if (isRolling && !canRoll && !hasRolledThisTurn) {
    return (
      <div className="mb-4 flex min-h-[8.5rem] flex-col items-center justify-center gap-2 md:min-h-[9.5rem]">
        <div className="flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-4 md:min-h-[6.5rem]">
          <div className="flex items-center gap-2" aria-hidden>
            <DieFace value={3} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
            <DieFace value={5} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
          </div>
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[#457b9d]">
            {t("dice.rolling")}
          </span>
        </div>
      </div>
    );
  }

  if (showRollResult && turnRoll) {
    return (
      <div className="mb-4 flex min-h-[8.5rem] flex-col items-center justify-center gap-2 md:min-h-[9.5rem]">
        <div
          className="flex min-h-[5.5rem] w-full items-center justify-center gap-3 rounded-xl bg-[#1a1a2e] px-5 py-4 md:min-h-[6.5rem] md:gap-4"
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
      </div>
    );
  }

  if (!canRoll && !currentIsBot && !currentIsAutoHuman) {
    return (
      <div className="mb-4 flex min-h-[8.5rem] flex-col items-center justify-center gap-2 md:min-h-[9.5rem]">
        <div className="flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-4 md:min-h-[6.5rem]">
          <div className="flex items-center gap-2" aria-hidden>
            <DieFace value={3} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
            <DieFace value={5} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
          </div>
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[#457b9d]">
            {t("room.waitingTurn", { label })}
          </span>
          {showExitAttempts && (
            <span className="text-[10px] font-medium text-[#d4c5a0]/80">
              {t("dice.exitAttempt", {
                current: attemptNumber,
                max: maxExitRollAttempts,
              })}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (currentIsBot || currentIsAutoHuman) {
    return (
      <div className="mb-4 flex min-h-[8.5rem] flex-col items-center justify-center gap-2 md:min-h-[9.5rem]">
        <div className="flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-4 md:min-h-[6.5rem]">
          <div className="flex items-center gap-2" aria-hidden>
            <DieFace value={3} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
            <DieFace value={5} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
          </div>
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[#457b9d]">
            {isRolling
              ? t("dice.rolling")
              : currentIsBot
                ? t("dice.cpuTurn")
                : t("dice.autoMode")}
          </span>
          {showExitAttempts && (
            <span className="text-[10px] font-medium text-[#d4c5a0]/80">
              {t("dice.exitAttempt", {
                current: attemptNumber,
                max: maxExitRollAttempts,
              })}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex min-h-[8.5rem] flex-col items-center justify-center gap-2 md:min-h-[9.5rem]">
      {showExitAttempts && turnRoll !== null && exitRollAttempts > 0 && (
        <div
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a1a2e]/80 px-3 py-1.5"
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
      )}
      <button
        type="button"
        onClick={isAiming ? cancelAim : armDice}
        disabled={!canRoll || isRolling}
        className={`flex w-full flex-col items-center gap-2 rounded-xl px-4 py-3 transition-all ${
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
          <DieFace value={3} className="h-14 w-14 md:h-16 md:w-16" />
          <DieFace value={5} className="h-14 w-14 md:h-16 md:w-16" />
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
