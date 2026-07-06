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

function RoleSwitch({
  isBot,
  disabled,
  onToggle,
}: {
  isBot: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isBot}
      aria-label={isBot ? "Máquina" : "Humano"}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`relative grid h-10 w-[11.5rem] shrink-0 grid-cols-2 overflow-hidden rounded-full border-2 p-1 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-[12.5rem] ${
        isBot
          ? "border-[#5a9fd4] bg-[#2d4a5e]"
          : "border-[#5c5c78] bg-[#252540]"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-[#fefae0] shadow-[0_2px_10px_rgba(0,0,0,0.28)] transition-[left,width] duration-200 ease-out"
        style={{
          left: isBot ? "calc(50% + 2px)" : "4px",
          width: "calc(50% - 6px)",
        }}
      />
      <span
        className={`relative z-10 flex items-center justify-center text-[11px] font-bold uppercase tracking-wide transition-colors duration-200 sm:text-xs ${
          !isBot ? "text-[#1a1a2e]" : "text-[#fefae0]/65"
        }`}
      >
        Humano
      </span>
      <span
        className={`relative z-10 flex items-center justify-center text-[11px] font-bold uppercase tracking-wide transition-colors duration-200 sm:text-xs ${
          isBot ? "text-[#1a1a2e]" : "text-[#fefae0]/65"
        }`}
      >
        Máquina
      </span>
    </button>
  );
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

  const toggleBot = (color: PlayerColor) => {
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

  const botCount = bots.filter((c) => selected.includes(c)).length;
  const humanCount = selected.length - botCount;
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
        <p className="max-w-md text-sm text-[var(--board-path-border)]">
          Toca un color para activarlo o quitarlo. Usa el switch para elegir
          humano o máquina — mínimo {MIN_PLAYERS} jugadores, al menos{" "}
          {MIN_HUMANS} humano, máximo {MAX_BOTS} IAs.
        </p>
      </div>

      <ul className="flex w-full max-w-md flex-col gap-3">
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
          const canToggleRole = canMarkBot || canUnmarkBot;

          return (
            <li key={color}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleColor(color)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleColor(color);
                  }
                }}
                aria-pressed={isSelected}
                className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border-4 px-4 py-3 transition-all sm:px-5 sm:py-3.5 ${
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
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11">
                    <GamePiece color={color} className="h-full w-full" />
                  </span>
                  <span className="truncate text-base font-semibold text-[var(--board-path)] sm:text-lg">
                    {label}
                  </span>
                </span>

                <RoleSwitch
                  isBot={isBot}
                  disabled={!isSelected || !canToggleRole}
                  onToggle={() => toggleBot(color)}
                />
              </div>
            </li>
          );
        })}
      </ul>

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
