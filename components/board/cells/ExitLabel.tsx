import type { MovementLabelOrientation } from "@/lib/board/cell-shapes";
import { MovementLabel } from "./MovementLabel";

export interface ExitLabelProps {
  orientation: MovementLabelOrientation;
}

/** Etiqueta EXIT rotada — usada por ExitCell */
export function ExitLabel({ orientation }: ExitLabelProps) {
  return <MovementLabel text="EXIT" orientation={orientation} />;
}
