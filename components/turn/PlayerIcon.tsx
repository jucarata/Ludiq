import type { ReactNode } from "react";
import { GamePiece } from "@/components/board/GamePiece";
import { PLAYER_COLORS, type PlayerColor } from "@/lib/board/types";

interface PlayerIconProps {
  color: PlayerColor;
  isActive?: boolean;
  label: string;
  /** Optional badge (e.g. turn timer) overlaid on the icon. */
  badge?: ReactNode;
  className?: string;
}

/** Circular player icon shown beside each player's dice dock. */
export function PlayerIcon({
  color,
  isActive = false,
  label,
  badge,
  className = "",
}: PlayerIconProps) {
  const { fill, dark } = PLAYER_COLORS[color];

  return (
    <div className={`relative shrink-0 ${className}`} title={label}>
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] bg-[#fffef8] sm:h-14 sm:w-14 md:h-16 md:w-16 md:border-4"
        style={{
          borderColor: isActive ? fill : dark,
          boxShadow: isActive ? `0 0 10px ${fill}88` : undefined,
        }}
      >
        <GamePiece color={color} className="h-[78%] w-[78%]" />
      </div>
      {badge}
    </div>
  );
}
