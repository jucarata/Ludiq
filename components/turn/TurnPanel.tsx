"use client";

import { useTurn } from "@/components/game/TurnContext";
import { GamePiece } from "@/components/board/GamePiece";
import { PLAYER_COLORS, PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";

function TeamEntry({
  color,
  isActive,
  timeLeft,
}: {
  color: PlayerColor;
  isActive: boolean;
  timeLeft: number;
}) {
  const { fill, label } = PLAYER_COLORS[color];

  return (
    <li
      className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-300 md:gap-3 md:px-3 md:py-2.5 ${
        isActive ? "bg-[#353550]" : "bg-[#1a1a2e] opacity-70"
      }`}
      style={
        isActive
          ? {
              boxShadow: `0 0 0 2px ${fill}, 0 0 18px ${fill}55`,
            }
          : undefined
      }
      aria-current={isActive ? "true" : undefined}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center md:h-9 md:w-9">
        <GamePiece color={color} className="h-full w-full" />
      </div>
      <span className="min-w-0 flex-1 truncate font-medium text-sm text-[#fefae0] md:text-base">
        {label}
      </span>
      {isActive && (
        <span className="shrink-0 rounded-md bg-[#fcd34d] px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-[#1a1a2e] shadow-[0_0_10px_rgba(252,211,77,0.45)] md:text-sm">
          {timeLeft}s
        </span>
      )}
    </li>
  );
}

export function TurnPanel() {
  const { currentPlayer, timeLeft } = useTurn();

  return (
    <aside
      className="flex w-[var(--board-size)] shrink-0 flex-col rounded-2xl border-[6px] border-[#d4c5a0] bg-[#2a2a3e] p-4 shadow-2xl md:w-56"
      aria-label="Panel de turnos"
    >
      <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-[#d4c5a0] md:mb-4">
        Turnos
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:flex md:flex-1 md:flex-col md:justify-center">
        {PLAYER_ORDER.map((color) => (
          <TeamEntry
            key={color}
            color={color}
            isActive={color === currentPlayer}
            timeLeft={timeLeft}
          />
        ))}
      </ul>
    </aside>
  );
}
