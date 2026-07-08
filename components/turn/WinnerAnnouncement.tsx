"use client";

import { useEffect } from "react";
import { useGameState } from "@/components/game/GameStateContext";
import { PLAYER_COLORS } from "@/lib/board/types";
import { playVictorySound } from "@/lib/game/sounds";

/** Overlay persistente al terminar el juego: anuncia al ganador */
export function WinnerAnnouncement() {
  const { winner } = useGameState();

  useEffect(() => {
    if (winner) playVictorySound();
  }, [winner]);

  if (!winner) return null;

  const { fill, dark, label } = PLAYER_COLORS[winner];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 p-4"
      aria-live="assertive"
      role="status"
    >
      <div
        className="rounded-2xl border-4 px-8 py-5 text-center shadow-2xl"
        style={{ borderColor: fill, backgroundColor: dark }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
          Game over! Winner
        </p>
        <p
          className="mt-1 text-3xl font-black uppercase tracking-wide md:text-4xl"
          style={{ color: fill }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
