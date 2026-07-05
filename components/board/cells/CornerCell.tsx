import type { TriangleCorner } from "@/lib/board/cell-shapes";
import {
  getCornerRotationLayout,
  TRIANGLE_CLIP,
} from "@/lib/board/cell-shapes";
import type { CornerRotation } from "@/lib/board/cell-shapes";
import { CORNER_HALF_REGIONS } from "@/lib/board/player-path";
import type { MovementCellProps } from "./MovementCell";
import { MovementCellRoot } from "./MovementCell";
import { CornerHalfPieces } from "./AnchorCellPieces";

interface CornerHalfProps {
  background: { className?: string; style?: React.CSSProperties };
  clipCorner: TriangleCorner;
  children?: React.ReactNode;
}

function CornerHalf({
  background,
  clipCorner,
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
      {children}
    </div>
  );
}

export interface CornerCellProps extends MovementCellProps {
  /** Rotación del corte diagonal */
  rotation: CornerRotation;
  /** Estilo de fondo compartido por ambos triángulos */
  background: { className?: string; style?: React.CSSProperties };
  /** Contenido solo en el primer triángulo (ficha, corona, etc.) */
  primaryContent?: React.ReactNode;
  /** Ancla lógica de la celda — para fichas del recorrido */
  anchor?: number;
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
  background,
  primaryContent,
  movement,
  safe,
  anchor,
  style,
  dividerWidth = 3,
}: CornerCellProps) {
  const layout = getCornerRotationLayout(rotation);

  return (
    <MovementCellRoot movement={movement} safe={safe} style={style}>
      <div className="relative h-full w-full min-h-0 min-w-0">
      <CornerHalf
        clipCorner={layout.first.corner}
        background={background}
      >
        {primaryContent}
      </CornerHalf>
      <CornerHalf
        clipCorner={layout.second.corner}
        background={background}
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
      {anchor !== undefined &&
        CORNER_HALF_REGIONS[anchor]?.map((region, half) => (
          <CornerHalfPieces
            key={half}
            anchor={anchor}
            half={half as 0 | 1}
            region={region}
          />
        ))}
    </MovementCellRoot>
  );
}
