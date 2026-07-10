"use client";

import type { MovementLabelOrientation } from "@/lib/board/cell-shapes";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { MovementLabel } from "./MovementLabel";

export interface ExitLabelProps {
  orientation: MovementLabelOrientation;
}

/** Etiqueta EXIT rotada — usada por ExitCell */
export function ExitLabel({ orientation }: ExitLabelProps) {
  const { t } = useTranslations();
  return <MovementLabel text={t("board.exit")} orientation={orientation} />;
}
