import type { CellData } from "@/lib/board/types";
import { GamePiece } from "../GamePiece";
import { VictoryCrown } from "../VictoryCrown";

/** Contenido central de una celda (ficha, corona, SAFE, etc.) */
export function CellContent({ cell }: { cell: CellData }) {
  if (cell.kind === "victory") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <VictoryCrown />
      </div>
    );
  }

  if (cell.kind === "safe" && cell.owner) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span
          className="select-none font-extrabold text-white"
          style={{ fontSize: "clamp(2px, 1.2vmin, 6px)" }}
        >
          SAFE
        </span>
      </div>
    );
  }

  return null;
}
