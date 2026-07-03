import type { CellData } from "@/lib/board/types";
import { PLAYER_COLORS, VICTORY_COLOR } from "@/lib/board/types";
import { GamePiece } from "./GamePiece";

interface BoardCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

function CellShell({
  children,
  className = "",
  style,
  gridStyle,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gridStyle?: React.CSSProperties;
}) {
  return (
    <div
      className="relative h-full w-full min-h-0 min-w-0"
      style={gridStyle}
    >
      <div
        className={`relative h-full w-full rounded-[2px] ${className}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

function GridNumber({ n, dark = false }: { n: number; dark?: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute top-[8%] left-[10%] z-10 select-none font-bold leading-none ${
        dark ? "text-[#5c4a3a]" : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
      }`}
      style={{ fontSize: "clamp(3px, 1.5vmin, 8px)" }}
    >
      {n}
    </span>
  );
}

function isDarkLabel(cell: CellData): boolean {
  return cell.kind === "path" || (cell.kind === "center" && !cell.owner);
}

export function BoardCell({ cell, style: gridStyle }: BoardCellProps) {
  const num = <GridNumber n={cell.gridNumber} dark={isDarkLabel(cell)} />;

  if (cell.kind === "void" && cell.owner) {
    return (
      <CellShell
        gridStyle={gridStyle}
        style={{ backgroundColor: PLAYER_COLORS[cell.owner].fill }}
      >
        {num}
      </CellShell>
    );
  }

  if (cell.kind === "base" && cell.owner !== undefined && cell.pieceSlot !== undefined) {
    return (
      <CellShell
        gridStyle={gridStyle}
        className="flex items-center justify-center"
        style={{ backgroundColor: PLAYER_COLORS[cell.owner].dark }}
      >
        {num}
        <GamePiece color={cell.owner} />
      </CellShell>
    );
  }

  if (cell.kind === "victory") {
    return (
      <CellShell gridStyle={gridStyle} style={{ backgroundColor: VICTORY_COLOR.fill }}>
        {num}
      </CellShell>
    );
  }

  if (cell.kind === "center") {
    const bg = cell.owner ? PLAYER_COLORS[cell.owner].fill : "var(--board-path)";
    return (
      <CellShell gridStyle={gridStyle} style={{ backgroundColor: bg }}>
        {num}
      </CellShell>
    );
  }

  if (cell.kind === "home" && cell.owner) {
    return (
      <CellShell
        gridStyle={gridStyle}
        style={{ backgroundColor: PLAYER_COLORS[cell.owner].fill }}
      >
        {num}
      </CellShell>
    );
  }

  if (cell.kind === "safe" && cell.owner) {
    return (
      <CellShell
        gridStyle={gridStyle}
        className="flex items-center justify-center"
        style={{ backgroundColor: PLAYER_COLORS[cell.owner].fill }}
      >
        {num}
        <span
          className="select-none font-extrabold text-white"
          style={{ fontSize: "clamp(2px, 1.2vmin, 6px)" }}
        >
          SAFE
        </span>
      </CellShell>
    );
  }

  if (cell.kind === "path") {
    return (
      <CellShell gridStyle={gridStyle} className="bg-[var(--board-path)]">
        {num}
      </CellShell>
    );
  }

  return (
    <CellShell gridStyle={gridStyle} className="bg-[var(--board-path)]">
      {num}
    </CellShell>
  );
}
