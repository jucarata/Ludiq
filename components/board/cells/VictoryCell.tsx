import { VICTORY_CELL_ANCHOR } from "@/lib/board/cell-placements";
import { VictoryCelebration } from "../VictoryCelebration";
import { VictoryCrown } from "../VictoryCrown";
import { VictoryFloralPattern } from "../VictoryFloralPattern";
import { AnchorCellPieces } from "./AnchorCellPieces";
import { CellShell } from "./CellChrome";
import type { MovementCellProps } from "./MovementCell";
import { MovementCellRoot } from "./MovementCell";

export interface VictoryCellProps extends MovementCellProps {}

/** Celda de victoria (centro): patrón floral con corona */
export function VictoryCell({ movement, style }: VictoryCellProps) {
  return (
    <MovementCellRoot movement={movement} style={style}>
      <CellShell className="victory-cell flex h-full w-full items-center justify-center">
        <VictoryFloralPattern />
        <VictoryCrown />
      </CellShell>
      {/* Ficha llegando al centro — visible mientras termina la animación */}
      <AnchorCellPieces anchor={VICTORY_CELL_ANCHOR} colSpan={2} rowSpan={2} />
      <VictoryCelebration />
    </MovementCellRoot>
  );
}
