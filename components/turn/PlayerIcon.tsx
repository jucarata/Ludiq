"use client";

import type { ReactNode } from "react";
import { GamePiece } from "@/components/board/GamePiece";
import { PLAYER_COLORS, type PlayerColor } from "@/lib/board/types";

interface PlayerIconProps {
  color: PlayerColor;
  isActive?: boolean;
  label: string;
  /** Name tag overlapping the bottom of the icon (profile / You / Bot). */
  nameTag: string;
  /** Highlight the local player's name tag (yellow text). */
  isSelf?: boolean;
  /** Optional badge (e.g. turn timer) overlaid on the icon. */
  badge?: ReactNode;
  className?: string;
}

/** Circular player icon shown beside each player's dice dock. */
export function PlayerIcon({
  color,
  isActive = false,
  label,
  nameTag,
  isSelf = false,
  badge,
  className = "",
}: PlayerIconProps) {
  const { fill, dark } = PLAYER_COLORS[color];

  return (
    <div
      className={`relative shrink-0 ${className}`}
      title={label}
      aria-label={`${nameTag} — ${label}`}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] bg-[#fffef8] sm:h-14 sm:w-14 md:h-16 md:w-16 md:border-4"
        style={{
          borderColor: isActive ? fill : dark,
          boxShadow: isActive ? `0 0 10px ${fill}88` : undefined,
        }}
      >
        <GamePiece color={color} className="h-[78%] w-[78%]" />
      </div>

      <span
        className={`pointer-events-none absolute bottom-0 left-1/2 z-10 max-w-[4.5rem] -translate-x-1/2 translate-y-[35%] truncate rounded-sm bg-[#1a1a2e] px-1.5 py-0.5 text-center text-[8px] font-bold uppercase leading-none tracking-wide shadow-md sm:max-w-[5.25rem] sm:text-[9px] md:max-w-[5.75rem] md:text-[10px] ${
          isSelf ? "text-[#fcd34d]" : "text-[#fefae0]"
        }`}
        style={{
          boxShadow: isSelf
            ? "0 0 0 1px #fcd34d88, 0 2px 8px rgba(0,0,0,0.45)"
            : isActive
              ? `0 0 0 1px ${fill}88, 0 2px 8px rgba(0,0,0,0.45)`
              : "0 2px 8px rgba(0,0,0,0.45)",
        }}
      >
        {nameTag}
      </span>

      {badge}
    </div>
  );
}
