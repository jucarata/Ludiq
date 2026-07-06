"use client";

import { useDice } from "@/components/dice/DiceContext";
import { useTurn } from "@/components/game/TurnContext";
import { useIsBot } from "@/components/game/PlayersContext";
import { DieFace } from "@/components/dice/DieFace";
import { PLAYER_COLORS } from "@/lib/board/types";

export function DiceLauncher() {
  const { currentPlayer } = useTurn();
  const isBot = useIsBot();
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
  const currentIsBot = isBot(currentPlayer);

  if (hasRolledThisTurn && turnRoll !== null) {
    return (
      <div className="mb-4 flex flex-col items-center gap-2 border-b border-[#d4c5a0]/25 pb-4">
        <div
          className="flex min-h-[5.5rem] items-center justify-center gap-3 rounded-xl bg-[#1a1a2e] px-5 py-4 md:min-h-[6.5rem] md:gap-4"
          aria-label={`${label} sacó ${turnRoll[0]} y ${turnRoll[1]}`}
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

  if (currentIsBot) {
    return (
      <div className="mb-4 flex flex-col items-center gap-2 border-b border-[#d4c5a0]/25 pb-4">
        <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-4 md:min-h-[6.5rem]">
          <div className="flex items-center gap-2" aria-hidden>
            <DieFace value={3} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
            <DieFace value={5} className="h-12 w-12 opacity-60 md:h-14 md:w-14" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#457b9d]">
            {isRolling ? "La máquina lanza…" : "Turno de la máquina"}
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
            ? "Cancelar lanzamiento de dados"
            : `Lanzar dados — turno de ${label}`
        }
      >
        <div className="flex items-center gap-2" aria-hidden>
          <DieFace value={3} className="h-14 w-14 md:h-16 md:w-16" />
          <DieFace value={5} className="h-14 w-14 md:h-16 md:w-16" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-[#d4c5a0]">
          {isAiming ? "Cancelar" : "Lanzar dados"}
        </span>
      </button>
      {isAiming && (
        <p className="text-center text-xs text-[#fefae0]/70">
          Toca el tablero para lanzar
        </p>
      )}
    </div>
  );
}
