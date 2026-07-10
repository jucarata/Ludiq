"use client";

import type { MovementLabelOrientation } from "@/lib/board/cell-shapes";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { MovementLabel } from "./MovementLabel";

export interface SafeLabelProps {
  orientation: MovementLabelOrientation;
}

/** Etiqueta SAFE rotada — usada por SafeBasicCell y SafeCornerCell */
export function SafeLabel({ orientation }: SafeLabelProps) {
  const { t } = useTranslations();
  return <MovementLabel text={t("board.safe")} orientation={orientation} />;
}
