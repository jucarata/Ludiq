import type { PlayerColor } from "@/lib/board/types";
import { PLAYER_COLORS } from "@/lib/board/types";

interface GamePieceProps {
  color: PlayerColor;
  className?: string;
}

export function GamePiece({ color, className = "h-[78%] w-[78%]" }: GamePieceProps) {
  const { fill, dark } = PLAYER_COLORS[color];

  return (
    <svg
      viewBox="0 0 26 26"
      aria-hidden
      className={`drop-shadow-sm ${className}`}
    >
      <circle cx="13" cy="13" r="11" fill={dark} />
      <circle cx="13" cy="13" r="9" fill={fill} />
      <circle cx="10" cy="10" r="2.5" fill="white" opacity="0.35" />
    </svg>
  );
}
