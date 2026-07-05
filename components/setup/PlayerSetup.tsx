"use client";

import { useState } from "react";
import Link from "next/link";
import { GamePiece } from "@/components/board/GamePiece";
import {
  PLAYER_COLORS,
  PLAYER_ORDER,
  type PlayerColor,
} from "@/lib/board/types";

const MIN_PLAYERS = 2;

interface PlayerSetupProps {
  onStart: (players: PlayerColor[]) => void;
}

export function PlayerSetup({ onStart }: PlayerSetupProps) {
  const [selected, setSelected] = useState<PlayerColor[]>([...PLAYER_ORDER]);

  const toggleColor = (color: PlayerColor) => {
    setSelected((prev) => {
      if (prev.includes(color)) {
        if (prev.length <= MIN_PLAYERS) return prev;
        return prev.filter((c) => c !== color);
      }
      return PLAYER_ORDER.filter(
        (c) => prev.includes(c) || c === color,
      );
    });
  };

  const canStart = selected.length >= MIN_PLAYERS;

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
          Jugadores
        </h1>
        <p className="text-sm text-[var(--board-path-border)]">
          Elige quién juega — mínimo {MIN_PLAYERS}
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-4">
        {PLAYER_ORDER.map((color) => {
          const { fill, label } = PLAYER_COLORS[color];
          const isSelected = selected.includes(color);

          return (
            <button
              key={color}
              type="button"
              onClick={() => toggleColor(color)}
              className={`flex flex-col items-center gap-3 rounded-2xl border-4 px-4 py-5 transition-all ${
                isSelected
                  ? "border-[var(--board-path-border)] bg-[#2a2a3e]"
                  : "border-transparent bg-[#1a1a2e] opacity-40"
              }`}
              style={
                isSelected
                  ? { boxShadow: `0 0 20px ${fill}44` }
                  : undefined
              }
              aria-pressed={isSelected}
            >
              <div className="h-14 w-14">
                <GamePiece color={color} className="h-full w-full" />
              </div>
              <span className="text-sm font-semibold text-[var(--board-path)]">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-[var(--board-path-border)]">
        {selected.length} jugador{selected.length !== 1 ? "es" : ""} seleccionado
        {selected.length !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="rounded-full border-2 border-[var(--board-path-border)] px-8 py-3 text-sm font-bold uppercase tracking-widest text-[var(--board-path-border)] transition-colors hover:border-[var(--board-path)] hover:text-[var(--board-path)]"
        >
          Volver
        </Link>
        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStart(selected)}
          className="rounded-full bg-[var(--board-green)] px-14 py-4 text-xl font-bold uppercase tracking-widest text-[var(--board-path)] shadow-lg transition-transform hover:scale-105 hover:bg-[var(--board-green-dark)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          Jugar
        </button>
      </div>
    </main>
  );
}
