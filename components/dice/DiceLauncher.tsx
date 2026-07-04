"use client";

import { useDice } from "@/components/dice/DiceContext";
import { useTurn } from "@/components/game/TurnContext";
import { DieFace } from "@/components/dice/DieFace";
import { PLAYER_COLORS } from "@/lib/board/types";

export function DiceLauncher() {
  const { currentPlayer } = useTurn();
  const {
    isAiming,
    isRolling,
    canRoll,
    hasRolledThisTurn,
    turnRoll,
    armDice,
    cancelAim,
  } = useDice();

  const { label } = PLAYER_COLORS[currentPlayer];

  if (hasRolledThisTurn && turnRoll !== null) {
    return (
      <div className="mb-4 flex flex-col items-center gap-2 border-b border-[#d4c5a0]/25 pb-4">
        <div
          className="flex min-h-[5.5rem] min-w-[5.5rem] flex-col items-center justify-center rounded-xl bg-[#1a1a2e] px-6 py-4 md:min-h-[6.5rem] md:min-w-[6.5rem]"
          aria-label={`${label} sacó ${turnRoll}`}
        >
          <span className="font-mono text-5xl font-black tabular-nums text-[#fcd34d] drop-shadow-[0_0_14px_rgba(252,211,77,0.55)] md:text-6xl">
            {turnRoll}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col items-center gap-2 border-b border-[#d4c5a0]/25 pb-4">
      <button
        type="button"
        onClick={isAiming ? cancelAim : armDice}
        disabled={!canRoll || isRolling}
        className={`flex flex-col items-center gap-2 rounded-xl px-4 py-3 transition-all ${
          isAiming
            ? "bg-[#353550] ring-2 ring-[#fcd34d] ring-offset-2 ring-offset-[#2a2a3e]"
            : "bg-[#1a1a2e] hover:bg-[#252540] disabled:cursor-not-allowed disabled:opacity-50"
        }`}
        aria-pressed={isAiming}
        aria-label={
          isAiming
            ? "Cancelar lanzamiento de dado"
            : `Lanzar dado — turno de ${label}`
        }
      >
        <DieFace className="h-14 w-14 md:h-16 md:w-16" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#d4c5a0]">
          {isAiming ? "Cancelar" : "Lanzar dado"}
        </span>
      </button>
      {isAiming && (
        <p className="text-center text-xs text-[#fefae0]/70">
          Arrastra y suelta en el tablero para tirar
        </p>
      )}
    </div>
  );
}
