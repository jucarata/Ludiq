import { VICTORY_COLOR } from "@/lib/board/types";
import { VICTORY_CELL_ANCHOR } from "@/lib/board/cell-placements";
import { VictoryCrown } from "../VictoryCrown";
import { AnchorCellPieces } from "./AnchorCellPieces";
import { CellShell } from "./CellChrome";
import type { MovementCellProps } from "./MovementCell";
import { MovementCellRoot } from "./MovementCell";

export interface VictoryCellProps extends MovementCellProps {}

/** Celda de victoria (centro): hereda de movimiento, siempre café con corona */
export function VictoryCell({ movement, style }: VictoryCellProps) {
  return (
    <MovementCellRoot movement={movement} style={style}>
      <CellShell
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: VICTORY_COLOR.fill }}
      >
        <VictoryCrown />
      </CellShell>
      {/* Ficha llegando al centro — visible mientras termina la animación */}
      <AnchorCellPieces anchor={VICTORY_CELL_ANCHOR} colSpan={2} rowSpan={2} />
    </MovementCellRoot>
  );
}
