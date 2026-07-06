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

  const isHumanTurn = !isBot(currentPlayer);
  const { label, fill } = PLAYER_COLORS[currentPlayer];
  const enabled = isAutoEnabled(currentPlayer);

  return (
    <div
      className={`mb-4 border-b pb-4 ${
        isHumanTurn ? "border-[#d4c5a0]/25" : "border-transparent"
      }`}
      aria-label={isHumanTurn ? "Modo automático" : undefined}
      aria-hidden={!isHumanTurn}
    >
      <label
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
          isHumanTurn
            ? `cursor-pointer ${
                enabled
                  ? "bg-[#353550]"
                  : "bg-[#1a1a2e]/80 hover:bg-[#1a1a2e]"
              }`
            : "pointer-events-none invisible"
        }`}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) =>
            setAutoEnabled(currentPlayer, event.target.checked)
          }
          disabled={!isHumanTurn}
          tabIndex={isHumanTurn ? 0 : -1}
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
