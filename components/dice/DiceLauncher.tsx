"use client";

import { useDice } from "@/components/dice/DiceContext";
import { DieFace } from "@/components/dice/DieFace";

export function DiceLauncher() {
  const { isAiming, isRolling, armDice, cancelAim, lastResult } = useDice();

  return (
    <div className="mb-4 flex flex-col items-center gap-2 border-b border-[#d4c5a0]/25 pb-4">
      <button
        type="button"
        onClick={isAiming ? cancelAim : armDice}
        disabled={isRolling}
        className={`flex flex-col items-center gap-2 rounded-xl px-4 py-3 transition-all ${
          isAiming
            ? "bg-[#353550] ring-2 ring-[#fcd34d] ring-offset-2 ring-offset-[#2a2a3e]"
            : "bg-[#1a1a2e] hover:bg-[#252540] disabled:opacity-50"
        }`}
        aria-pressed={isAiming}
        aria-label={
          isAiming
            ? "Cancelar lanzamiento de dado"
            : "Tomar dado para lanzar en el tablero"
        }
      >
        <DieFace className="h-14 w-14 md:h-16 md:w-16" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#d4c5a0]">
          {isAiming ? "Cancelar" : "Lanzar dado"}
        </span>
      </button>
      {isAiming && (
        <p className="text-center text-xs text-[#fefae0]/70">
          Haz clic en el tablero para tirar
        </p>
      )}
      {lastResult !== null && !isRolling && !isAiming && (
        <p className="font-mono text-sm font-bold text-[#fcd34d]">
          Último: {lastResult}
        </p>
      )}
    </div>
  );
}
