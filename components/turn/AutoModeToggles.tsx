"use client";

import { useTurn } from "@/components/game/TurnContext";
import { useIsBot } from "@/components/game/PlayersContext";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { GamePiece } from "@/components/board/GamePiece";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { getPlayerColorLabel } from "@/lib/i18n";
import { PLAYER_COLORS } from "@/lib/board/types";

export function AutoModeToggles() {
  const { currentPlayer } = useTurn();
  const isBot = useIsBot();
  const { isAutoEnabled, setAutoEnabled, canControlAuto } = useAutoMode();
  const { t, locale } = useTranslations();

  const isHumanTurn = !isBot(currentPlayer);
  const canToggle = isHumanTurn && canControlAuto(currentPlayer);
  const { fill } = PLAYER_COLORS[currentPlayer];
  const label = getPlayerColorLabel(locale, currentPlayer);
  const enabled = isAutoEnabled(currentPlayer);

  return (
    <div
      className={`mb-4 border-b pb-4 ${
        canToggle ? "border-[#d4c5a0]/25" : "border-transparent"
      }`}
      aria-label={canToggle ? t("turn.autoMode") : undefined}
      aria-hidden={!canToggle}
    >
      <label
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
          canToggle
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
          disabled={!canToggle}
          tabIndex={canToggle ? 0 : -1}
          className="h-4 w-4 shrink-0 cursor-pointer accent-[#fcd34d]"
          aria-label={t("turn.autoFor", { label })}
        />
        <GamePiece color={currentPlayer} className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#fefae0] md:text-sm">
          {t("turn.auto")}
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
