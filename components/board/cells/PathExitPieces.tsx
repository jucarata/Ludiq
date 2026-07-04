import type { PlayerColor } from "@/lib/board/types";
import { GamePiece } from "../GamePiece";

interface PathExitPiecesProps {
  player: PlayerColor;
  pieces: { index: number }[];
}

/** Fichas agrupadas en la casilla de salida — grid 2×2, sin desbordar */
export function PathExitPieces({ player, pieces }: PathExitPiecesProps) {
  if (pieces.length === 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden p-[14%]"
      aria-label={`${pieces.length} ficha(s) en salida`}
    >
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[5%]">
        {pieces.map((piece) => (
          <div
            key={piece.index}
            className="flex min-h-0 min-w-0 items-center justify-center"
          >
            <GamePiece
              color={player}
              className="aspect-square h-full w-full max-h-full max-w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
