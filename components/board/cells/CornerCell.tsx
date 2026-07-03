import type { TriangleCorner } from "@/lib/board/cell-shapes";
import {
  getCornerRotationLayout,
  TRIANGLE_CLIP,
} from "@/lib/board/cell-shapes";
import type { CornerRotation } from "@/lib/board/cell-shapes";
import { GridNumber } from "./CellChrome";
import type { MovementCellProps } from "./MovementCell";
import { MovementCellRoot } from "./MovementCell";

interface CornerHalfProps {
  gridNumber: number;
  labelCorner: TriangleCorner;
  background: { className?: string; style?: React.CSSProperties };
  clipCorner: TriangleCorner;
  darkLabel?: boolean;
  children?: React.ReactNode;
}

function CornerHalf({
  gridNumber,
  labelCorner,
  background,
  clipCorner,
  darkLabel = false,
  children,
}: CornerHalfProps) {
  return (
    <div
      className={`absolute inset-0 ${background.className ?? ""}`}
      style={{
        ...background.style,
        clipPath: TRIANGLE_CLIP[clipCorner],
      }}
    >
      <GridNumber n={gridNumber} dark={darkLabel} labelCorner={labelCorner} />
      {children}
    </div>
  );
}

export interface CornerCellProps extends MovementCellProps {
  /** Rotación del corte diagonal */
  rotation: CornerRotation;
  /** Números visibles de cada triángulo */
  numbers: readonly [number, number];
  /** Estilo de fondo compartido por ambos triángulos */
  background: { className?: string; style?: React.CSSProperties };
  /** Etiquetas oscuras (camino blanco) */
  darkLabel?: boolean;
  /** Contenido solo en el primer triángulo (ficha, corona, etc.) */
  primaryContent?: React.ReactNode;
  /** Posición en el grid CSS */
  style?: React.CSSProperties;
  /** Grosor visual del divisor (px) */
  dividerWidth?: number;
}

/**
 * Celda de movimiento esquinal: cuadrado 2×2 partido en dos triángulos rectángulos.
 * Rota con `rotation` para cambiar el lado del corte.
 */
export function CornerCell({
  rotation,
  numbers,
  background,
  darkLabel = false,
  primaryContent,
  movement,
  style,
  dividerWidth = 3,
}: CornerCellProps) {
  const layout = getCornerRotationLayout(rotation);

  return (
    <MovementCellRoot movement={movement} style={style}>
      <div className="relative h-full w-full min-h-0 min-w-0">
      <CornerHalf
        gridNumber={numbers[0]}
        labelCorner={layout.first.labelCorner}
        clipCorner={layout.first.corner}
        background={background}
        darkLabel={darkLabel}
      >
        {primaryContent}
      </CornerHalf>
      <CornerHalf
        gridNumber={numbers[1]}
        labelCorner={layout.second.labelCorner}
        clipCorner={layout.second.corner}
        background={background}
        darkLabel={darkLabel}
      />
      <svg
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line
          x1={layout.divider.x1}
          y1={layout.divider.y1}
          x2={layout.divider.x2}
          y2={layout.divider.y2}
          stroke="var(--board-path-border)"
          strokeWidth={dividerWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      </div>
    </MovementCellRoot>
  );
}
