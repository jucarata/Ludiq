"use client";

import { useTurn } from "@/components/game/TurnContext";
import { useIsBot } from "@/components/game/PlayersContext";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { GamePiece } from "@/components/board/GamePiece";
import { PLAYER_COLORS } from "@/lib/board/types";

export function AutoModeToggles() {
  const { currentPlayer } = useTurn();
  const isBot = useIsBot();
  const { isAutoEnabled, setAutoEnabled } = useAutoMode();

  if (isBot(currentPlayer)) return null;

  const { label, fill } = PLAYER_COLORS[currentPlayer];
  const enabled = isAutoEnabled(currentPlayer);

  return (
    <div
      className="mb-4 border-b border-[#d4c5a0]/25 pb-4"
      aria-label="Modo automático"
    >
      <label
        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
          enabled ? "bg-[#353550]" : "bg-[#1a1a2e]/80 hover:bg-[#1a1a2e]"
        }`}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) =>
            setAutoEnabled(currentPlayer, event.target.checked)
          }
          className="h-4 w-4 shrink-0 cursor-pointer accent-[#fcd34d]"
          aria-label={`Automático — ${label}`}
        />
        <GamePiece color={currentPlayer} className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#fefae0] md:text-sm">
          Automático
        </span>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: fill }}
          aria-hidden
        />
      </label>
    </div>
  );
}
