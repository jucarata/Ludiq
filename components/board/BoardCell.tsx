import type { CellData } from "@/lib/board/types";
import { PLAYER_COLORS, VICTORY_COLOR } from "@/lib/board/types";
import { GamePiece } from "./GamePiece";
import { VictoryCrown } from "./VictoryCrown";

interface BoardCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

const TRIANGLE_CLIP = {
  "upper-left": "polygon(0 0, 100% 0, 0 100%)",
  "lower-right": "polygon(100% 0, 100% 100%, 0 100%)",
  "upper-right": "polygon(0 0, 100% 0, 100% 100%)",
  "lower-left": "polygon(0 0, 0 100%, 100% 100%)",
} as const;

const DIAGONAL_CONFIG = {
  "down-right": {
    first: "upper-left" as const,
    second: "lower-right" as const,
    line: { x1: 0, y1: 0, x2: 100, y2: 100 },
  },
  "down-left": {
    first: "upper-right" as const,
    second: "lower-left" as const,
    line: { x1: 100, y1: 0, x2: 0, y2: 100 },
  },
};

function CellShell({
  children,
  className = "",
  style,
  gridStyle,
  clipPath,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gridStyle?: React.CSSProperties;
  clipPath?: string;
}) {
  return (
    <div className="relative h-full w-full min-h-0 min-w-0" style={gridStyle}>
      <div
        className={`relative h-full w-full rounded-[2px] ${className}`}
        style={{ ...style, clipPath }}
      >
        {children}
      </div>
    </div>
  );
}

function GridNumber({
  n,
  dark = false,
  triangleHalf,
}: {
  n: number;
  dark?: boolean;
  triangleHalf?: CellData["triangleHalf"];
}) {
  const position =
    triangleHalf === "lower-right"
      ? "bottom-[8%] right-[10%] top-auto left-auto"
      : triangleHalf === "upper-right"
        ? "top-[8%] right-[10%] left-auto"
        : triangleHalf === "lower-left"
          ? "bottom-[8%] left-[10%] top-auto"
          : "top-[8%] left-[10%]";

  return (
    <span
      className={`pointer-events-none absolute ${position} z-10 select-none font-bold leading-none ${
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

function cellBackground(cell: CellData): { className?: string; style?: React.CSSProperties } {
  if (cell.kind === "void" && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].fill } };
  }
  if (cell.kind === "base" && cell.owner !== undefined) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].dark } };
  }
  if (cell.kind === "victory") {
    return { style: { backgroundColor: VICTORY_COLOR.fill } };
  }
  if (cell.kind === "center") {
    return {
      style: {
        backgroundColor: cell.owner
          ? PLAYER_COLORS[cell.owner].fill
          : "var(--board-path)",
      },
    };
  }
  if ((cell.kind === "home" || cell.kind === "safe") && cell.owner) {
    return { style: { backgroundColor: PLAYER_COLORS[cell.owner].fill } };
  }
  return { className: "bg-[var(--board-path)]" };
}

function TriangleHalf({
  cell,
  half,
  gridNumber,
  isPrimaryHalf = false,
}: {
  cell: CellData;
  half: CellData["triangleHalf"];
  gridNumber: number;
  isPrimaryHalf?: boolean;
}) {
  const bg = cellBackground(cell);
  const num = (
    <GridNumber
      n={gridNumber}
      dark={isDarkLabel(cell)}
      triangleHalf={half}
    />
  );

  return (
    <div
      className={`absolute inset-0 ${bg.className ?? ""}`}
      style={{ ...bg.style, clipPath: half ? TRIANGLE_CLIP[half] : undefined }}
    >
      {num}
      {isPrimaryHalf &&
        cell.kind === "base" &&
        cell.pieceSlot !== undefined &&
        cell.owner && (
          <div className="flex h-full w-full items-center justify-center">
            <GamePiece color={cell.owner} />
          </div>
        )}
      {isPrimaryHalf && cell.kind === "victory" && (
        <div className="flex h-full w-full items-center justify-center">
          <VictoryCrown />
        </div>
      )}
      {isPrimaryHalf && cell.kind === "safe" && cell.owner && (
        <div className="flex h-full w-full items-center justify-center">
          <span
            className="select-none font-extrabold text-white"
            style={{ fontSize: "clamp(2px, 1.2vmin, 6px)" }}
          >
            SAFE
          </span>
        </div>
      )}
    </div>
  );
}

interface DiagonalSplitCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

/** Un solo slot 2×2 con dos triángulos rectángulos en diagonal */
export function DiagonalSplitCell({ cell, style }: DiagonalSplitCellProps) {
  const config = DIAGONAL_CONFIG[cell.diagonalDirection ?? "down-right"];

  return (
    <div className="relative h-full w-full min-h-0 min-w-0" style={style}>
      <TriangleHalf
        cell={cell}
        half={config.first}
        gridNumber={cell.gridNumber}
        isPrimaryHalf
      />
      <TriangleHalf
        cell={cell}
        half={config.second}
        gridNumber={cell.diagonalPartnerNumber!}
      />
      <svg
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line
          x1={config.line.x1}
          y1={config.line.y1}
          x2={config.line.x2}
          y2={config.line.y2}
          stroke="var(--board-path-border)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function shellProps(cell: CellData, gridStyle?: React.CSSProperties) {
  const clipPath = cell.triangleHalf
    ? TRIANGLE_CLIP[cell.triangleHalf]
    : undefined;
  return { gridStyle, clipPath };
}

export function BoardCell({ cell, style: gridStyle }: BoardCellProps) {
  const num = (
    <GridNumber
      n={cell.gridNumber}
      dark={isDarkLabel(cell)}
      triangleHalf={cell.triangleHalf}
    />
  );
  const shared = shellProps(cell, gridStyle);

  if (cell.kind === "void" && cell.owner) {
    return (
      <CellShell
        {...shared}
        style={{ backgroundColor: PLAYER_COLORS[cell.owner].fill }}
      >
        {num}
      </CellShell>
    );
  }

  if (cell.kind === "base" && cell.owner !== undefined && cell.pieceSlot !== undefined) {
    return (
      <CellShell
        {...shared}
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
      <CellShell
        {...shared}
        className="flex items-center justify-center"
        style={{ backgroundColor: VICTORY_COLOR.fill }}
      >
        {num}
        <VictoryCrown />
      </CellShell>
    );
  }

  if (cell.kind === "center") {
    const bg = cell.owner ? PLAYER_COLORS[cell.owner].fill : "var(--board-path)";
    return (
      <CellShell {...shared} style={{ backgroundColor: bg }}>
        {num}
      </CellShell>
    );
  }

  if (cell.kind === "home" && cell.owner) {
    return (
      <CellShell
        {...shared}
        style={{ backgroundColor: PLAYER_COLORS[cell.owner].fill }}
      >
        {num}
      </CellShell>
    );
  }

  if (cell.kind === "safe" && cell.owner) {
    return (
      <CellShell
        {...shared}
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
      <CellShell {...shared} className="bg-[var(--board-path)]">
        {num}
      </CellShell>
    );
  }

  return (
    <CellShell {...shared} className="bg-[var(--board-path)]">
      {num}
    </CellShell>
  );
}
