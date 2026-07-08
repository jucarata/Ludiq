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
import {
  retroBackButtonClassName,
  retroPlayButtonClassName,
  retroRoleSwitchClassName,
  retroRoleSwitchLabelActiveClassName,
  retroRoleSwitchLabelInactiveClassName,
  retroRoleSwitchThumbClassName,
} from "@/lib/fonts";

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
      aria-label={isBot ? "CPU" : "Human"}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={retroRoleSwitchClassName}
    >
      <span
        aria-hidden
        className={retroRoleSwitchThumbClassName}
        style={{
          left: isBot ? "calc(50% + 2px)" : "4px",
          width: "calc(50% - 6px)",
        }}
      />
      <span
        className={
          !isBot
            ? retroRoleSwitchLabelActiveClassName
            : retroRoleSwitchLabelInactiveClassName
        }
      >
        Human
      </span>
      <span
        className={
          isBot
            ? retroRoleSwitchLabelActiveClassName
            : retroRoleSwitchLabelInactiveClassName
        }
      >
        CPU
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
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
          Players
        </h1>
        <p className="max-w-md text-sm text-[var(--board-path-border)]">
          Tap a color to enable or remove it. Use the switch to choose human or
          CPU — minimum {MIN_PLAYERS} players, at least {MIN_HUMANS} human,
          maximum {MAX_BOTS} CPUs.
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
        {selected.length} player{selected.length !== 1 ? "s" : ""} ·{" "}
        {humanCount} human{humanCount !== 1 ? "s" : ""} · {botCount} CPU
        {botCount !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Link href="/" className={retroBackButtonClassName}>
          Back
        </Link>
        <button
          type="button"
          disabled={!canStart}
          onClick={handleStart}
          className={retroPlayButtonClassName}
        >
          Play
        </button>
      </div>
    </main>
  );
}
