import type { MovementLabelOrientation } from "@/lib/board/cell-shapes";
import { MovementLabel } from "./MovementLabel";

export interface SafeLabelProps {
  orientation: MovementLabelOrientation;
}

/** Etiqueta SAFE rotada — usada por SafeBasicCell y SafeCornerCell */
export function SafeLabel({ orientation }: SafeLabelProps) {
  return <MovementLabel text="SAFE" orientation={orientation} />;
}
