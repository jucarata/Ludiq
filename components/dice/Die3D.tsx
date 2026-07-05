import type { CSSProperties } from "react";

const DOT_LAYOUT: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [30, 30],
    [70, 70],
  ],
  3: [
    [30, 30],
    [50, 50],
    [70, 70],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  5: [
    [30, 30],
    [70, 30],
    [50, 50],
    [30, 70],
    [70, 70],
  ],
  6: [
    [30, 28],
    [70, 28],
    [30, 50],
    [70, 50],
    [30, 72],
    [70, 72],
  ],
};

/**
 * Disposición estándar de dado (caras opuestas suman 7):
 * 1 frente, 6 atrás, 2 derecha, 5 izquierda, 3 arriba, 4 abajo.
 */
const FACE_PLACEMENT: Record<number, string> = {
  1: "rotateY(0deg)",
  2: "rotateY(90deg)",
  3: "rotateX(90deg)",
  4: "rotateX(-90deg)",
  5: "rotateY(-90deg)",
  6: "rotateY(180deg)",
};

/** Rotación del cubo que deja la cara `value` mirando al frente. */
export function getFaceRotation(value: number): { x: number; y: number } {
  switch (value) {
    case 2:
      return { x: 0, y: -90 };
    case 3:
      return { x: -90, y: 0 };
    case 4:
      return { x: 90, y: 0 };
    case 5:
      return { x: 0, y: 90 };
    case 6:
      return { x: 0, y: 180 };
    default:
      return { x: 0, y: 0 };
  }
}

export interface Die3DProps {
  sizePx: number;
  /** Transform CSS con la orientación del cubo, p. ej. "rotateX(-90deg) rotateY(90deg)". */
  orientation: string;
  /** Duración de la transición hacia `orientation`; 0 = seguir la orientación sin animar. */
  transitionMs?: number;
  className?: string;
}

/** Dado 3D construido con CSS 3D transforms (cubo de 6 caras con puntos). */
export function Die3D({
  sizePx,
  orientation,
  transitionMs = 0,
  className = "",
}: Die3DProps) {
  const half = sizePx / 2;

  const faceStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    borderRadius: sizePx * 0.16,
    background: "linear-gradient(145deg, #fffef8 0%, #fefae0 55%, #efe4c4 100%)",
    border: `${Math.max(1.5, sizePx * 0.045)}px solid #d4c5a0`,
    boxShadow: "inset 0 0 0.35em rgba(90, 74, 40, 0.18)",
  };

  return (
    <div
      className={className}
      style={{
        width: sizePx,
        height: sizePx,
        perspective: sizePx * 4.5,
      }}
      aria-hidden
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: orientation,
          transition: transitionMs
            ? `transform ${transitionMs}ms cubic-bezier(0.25, 1.25, 0.4, 1)`
            : undefined,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <div
            key={face}
            style={{
              ...faceStyle,
              transform: `${FACE_PLACEMENT[face]} translateZ(${half}px)`,
            }}
          >
            {DOT_LAYOUT[face].map(([cx, cy], index) => (
              <span
                key={index}
                style={{
                  position: "absolute",
                  left: `${cx}%`,
                  top: `${cy}%`,
                  width: "17%",
                  height: "17%",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "9999px",
                  background:
                    "radial-gradient(circle at 35% 30%, #4a4a63 0%, #2a2a3e 70%)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
