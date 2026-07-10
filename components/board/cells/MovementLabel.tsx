import type { MovementLabelOrientation } from "@/lib/board/cell-shapes";
import { getMovementLabelRotation } from "@/lib/board/cell-shapes";

export interface MovementLabelProps {
  text: string;
  orientation: MovementLabelOrientation;
}

/** Etiqueta rotada SAFE / EXIT */
export function MovementLabel({ text, orientation }: MovementLabelProps) {
  const degrees = getMovementLabelRotation(orientation);

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
      <span
        className="select-none font-extrabold text-white"
        style={{
          fontSize: "clamp(5px, 3vmin, 14px)",
          transform: `rotate(${degrees}deg)`,
        }}
      >
        {text}
      </span>
    </div>
  );
}
