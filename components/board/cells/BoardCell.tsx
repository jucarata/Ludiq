import type { CellData } from "@/lib/board/types";
import { BasicCell } from "./BasicCell";
import { CellContent } from "./CellContent";
import { getCellAppearance, isDarkLabel } from "./CellChrome";
import { CornerCell } from "./CornerCell";
import { DecorationCell } from "./DecorationCell";
import { StartCell } from "./StartCell";

export interface BoardCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

/** Enruta cada celda a su componente según `cell.shape` */
export function BoardCell({ cell, style }: BoardCellProps) {
  if (cell.shape === "start" && cell.owner && cell.start) {
    return (
      <StartCell
        color={cell.owner}
        state={cell.start.state}
        gridNumber={cell.gridNumber}
        style={style}
      />
    );
  }

  if (cell.shape === "decoration" && cell.owner) {
    return (
      <DecorationCell
        color={cell.owner}
        gridNumber={cell.gridNumber}
        style={style}
      />
    );
  }

  if (cell.shape === "corner" && cell.corner) {
    return (
      <CornerCell
        rotation={cell.corner.rotation}
        numbers={[cell.gridNumber, cell.corner.partnerNumber]}
        background={getCellAppearance(cell)}
        darkLabel={isDarkLabel(cell)}
        primaryContent={<CellContent cell={cell} />}
        style={style}
      />
    );
  }

  return <BasicCell cell={cell} style={style} />;
}

export { BasicCell } from "./BasicCell";
export { CornerCell } from "./CornerCell";
export { DecorationCell } from "./DecorationCell";
export { StartCell } from "./StartCell";
export type { CornerCellProps } from "./CornerCell";
export type { DecorationCellProps } from "./DecorationCell";
export type { StartCellProps } from "./StartCell";
