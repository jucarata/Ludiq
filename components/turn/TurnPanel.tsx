"use client";

import { useTurn } from "@/components/game/TurnContext";
import { useActivePlayers, useIsBot } from "@/components/game/PlayersContext";
import { GamePiece } from "@/components/board/GamePiece";
import { DiceLauncher } from "@/components/dice/DiceLauncher";
import { AutoModeToggles } from "@/components/turn/AutoModeToggles";
import { PLAYER_COLORS, type PlayerColor } from "@/lib/board/types";

function TeamEntry({
  color,
  isActive,
  timeLeft,
  isBot,
}: {
  color: PlayerColor;
  isActive: boolean;
  timeLeft: number;
  isBot: boolean;
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
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-sm text-[#fefae0] md:text-base">
          {label}
        </span>
        {isBot && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#457b9d] md:text-xs">
            Máquina
          </span>
        )}
      </div>
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
  const activePlayers = useActivePlayers();
  const isBot = useIsBot();

  return (
    <aside
      className="flex w-full max-w-full shrink-0 flex-col rounded-2xl border-[6px] border-[#d4c5a0] bg-[#2a2a3e] p-3 shadow-2xl sm:p-4 md:w-[var(--turn-panel-width)] md:max-w-none"
      aria-label="Panel de turnos"
    >
      <DiceLauncher />
      <AutoModeToggles />
      <ul className="grid grid-cols-2 gap-3 md:flex md:flex-1 md:flex-col md:justify-center">
        {activePlayers.map((color) => (
          <TeamEntry
            key={color}
            color={color}
            isActive={color === currentPlayer}
            timeLeft={timeLeft}
            isBot={isBot(color)}
          />
        ))}
      </ul>
    </aside>
  );
}
