"use client";

import { useTurn } from "@/components/game/TurnContext";
import { useIsBot } from "@/components/game/PlayersContext";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { getPlayerColorLabel } from "@/lib/i18n";
import type { PlayerColor } from "@/lib/board/types";

/** Compact auto-mode control for a specific player's corner dock. */
export function AutoModeToggles({ color }: { color?: PlayerColor }) {
  const { currentPlayer } = useTurn();
  const target = color ?? currentPlayer;
  const isBot = useIsBot();
  const { isAutoEnabled, setAutoEnabled, canControlAuto } = useAutoMode();
  const { t, locale } = useTranslations();

  // Stay mounted for controllable humans so the dock doesn't jump on turn change.
  if (isBot(target) || !canControlAuto(target)) return null;

  const canToggle = target === currentPlayer;
  const label = getPlayerColorLabel(locale, target);
  const enabled = isAutoEnabled(target);

  return (
    <label
      className={`inline-flex w-fit cursor-pointer items-center justify-start gap-0.5 rounded px-1 py-0 text-[8px] font-semibold uppercase leading-none tracking-wide transition-colors sm:text-[9px] ${
        !canToggle
          ? "cursor-not-allowed opacity-45"
          : enabled
            ? "bg-[#353550] text-[#fcd34d]"
            : "bg-[#1a1a2e]/80 text-[#fefae0]/80 hover:bg-[#1a1a2e]"
      }`}
      aria-label={t("turn.autoMode")}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => setAutoEnabled(target, event.target.checked)}
        disabled={!canToggle}
        className="h-2.5 w-2.5 shrink-0 accent-[#fcd34d] disabled:cursor-not-allowed"
        aria-label={t("turn.autoFor", { label })}
      />
      {t("turn.auto")}
    </label>
  );
}
