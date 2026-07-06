"use client";

import { useState } from "react";
import Link from "next/link";
import { GamePiece } from "@/components/board/GamePiece";
import {
  PLAYER_COLORS,
  PLAYER_ORDER,
  type PlayerColor,
} from "@/lib/board/types";
import {
  MAX_BOTS,
  MIN_HUMANS,
  MIN_PLAYERS,
  type GameSetup,
} from "@/lib/game/player-config";

interface PlayerSetupProps {
  onStart: (setup: GameSetup) => void;
}

export function PlayerSetup({ onStart }: PlayerSetupProps) {
  const [selected, setSelected] = useState<PlayerColor[]>([...PLAYER_ORDER]);
  const [bots, setBots] = useState<PlayerColor[]>([]);

  const toggleColor = (color: PlayerColor) => {
    setSelected((prev) => {
      if (prev.includes(color)) {
        if (prev.length <= MIN_PLAYERS) return prev;
        setBots((botPrev) => botPrev.filter((c) => c !== color));
        return prev.filter((c) => c !== color);
      }
      return PLAYER_ORDER.filter((c) => prev.includes(c) || c === color);
    });
  };

  const toggleBot = (color: PlayerColor, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!selected.includes(color)) return;

    setBots((prev) => {
      if (prev.includes(color)) {
        return prev.filter((c) => c !== color);
      }

      const humanCount = selected.length - prev.length;
      if (humanCount <= MIN_HUMANS) return prev;
      if (prev.length >= MAX_BOTS) return prev;

      return [...prev, color];
    });
  };

  const humanCount = selected.length - bots.filter((c) => selected.includes(c)).length;
  const botCount = bots.filter((c) => selected.includes(c)).length;
  const canStart =
    selected.length >= MIN_PLAYERS &&
    humanCount >= MIN_HUMANS &&
    botCount <= MAX_BOTS;

  const handleStart = () => {
    onStart({
      activePlayers: selected,
      botPlayers: bots.filter((c) => selected.includes(c)),
    });
  };

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
          Jugadores
        </h1>
        <p className="max-w-sm text-sm text-[var(--board-path-border)]">
          Elige quién juega y marca cuáles son la máquina — mínimo{" "}
          {MIN_PLAYERS} jugadores, al menos {MIN_HUMANS} humano, máximo{" "}
          {MAX_BOTS} IAs
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-4">
        {PLAYER_ORDER.map((color) => {
          const { fill, label } = PLAYER_COLORS[color];
          const isSelected = selected.includes(color);
          const isBot = bots.includes(color);
          const humansLeft = selected.length - botCount;
          const canMarkBot =
            isSelected &&
            !isBot &&
            botCount < MAX_BOTS &&
            humansLeft > MIN_HUMANS;
          const canUnmarkBot = isSelected && isBot;

          return (
            <div
              key={color}
              className={`flex flex-col items-center gap-2 rounded-2xl border-4 px-3 py-4 transition-all ${
                isSelected
                  ? "border-[var(--board-path-border)] bg-[#2a2a3e]"
                  : "border-transparent bg-[#1a1a2e] opacity-40"
              }`}
              style={
                isSelected
                  ? { boxShadow: `0 0 20px ${fill}44` }
                  : undefined
              }
            >
              <button
                type="button"
                onClick={() => toggleColor(color)}
                className="flex w-full flex-col items-center gap-2"
                aria-pressed={isSelected}
              >
                <div className="h-12 w-12 sm:h-14 sm:w-14">
                  <GamePiece color={color} className="h-full w-full" />
                </div>
                <span className="text-sm font-semibold text-[var(--board-path)]">
                  {label}
                </span>
              </button>

              {isSelected && (
                <button
                  type="button"
                  onClick={(event) => toggleBot(color, event)}
                  disabled={!canMarkBot && !canUnmarkBot}
                  className={`w-full rounded-lg px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                    isBot
                      ? "bg-[#457b9d] text-[#fefae0]"
                      : "bg-[#1a1a2e] text-[var(--board-path-border)] hover:bg-[#252540] hover:text-[var(--board-path)]"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-pressed={isBot}
                >
                  {isBot ? "Máquina" : "Humano"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-[var(--board-path-border)]">
        {selected.length} jugador{selected.length !== 1 ? "es" : ""} ·{" "}
        {humanCount} humano{humanCount !== 1 ? "s" : ""} · {botCount} IA
        {botCount !== 1 ? "s" : ""}
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
          onClick={handleStart}
          className="rounded-full bg-[var(--board-green)] px-14 py-4 text-xl font-bold uppercase tracking-widest text-[var(--board-path)] shadow-lg transition-transform hover:scale-105 hover:bg-[var(--board-green-dark)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          Jugar
        </button>
      </div>
    </main>
  );
}
