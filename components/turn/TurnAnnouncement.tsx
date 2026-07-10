"use client";

import { useTurn } from "@/components/game/TurnContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { getPlayerColorLabel } from "@/lib/i18n";
import { PLAYER_COLORS } from "@/lib/board/types";
import { TURN_ANNOUNCEMENT_MS } from "@/lib/game/turns";

export function TurnAnnouncement() {
  const { announcement } = useTurn();
  const { t, locale } = useTranslations();

  if (!announcement) return null;

  const { fill, dark } = PLAYER_COLORS[announcement];
  const label = getPlayerColorLabel(locale, announcement);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-2xl p-4"
      aria-live="assertive"
      role="status"
    >
      <div
        className="turn-announcement rounded-2xl border-4 px-8 py-5 text-center shadow-2xl"
        style={{
          borderColor: fill,
          backgroundColor: dark,
          animationDuration: `${TURN_ANNOUNCEMENT_MS}ms`,
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
          {t("turn.turn")}
        </p>
        <p
          className="mt-1 text-3xl font-black uppercase tracking-wide md:text-4xl"
          style={{ color: fill }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
