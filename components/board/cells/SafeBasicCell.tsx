import type { BasicCellProps } from "./BasicCell";
import { BasicCell } from "./BasicCell";
import { SafeLabel } from "./SafeLabel";

export type { BasicCellProps as SafeBasicCellProps };

/** Celda SAFE rectangular — hereda de BasicCell */
export function SafeBasicCell(props: BasicCellProps) {
  const { cell } = props;
  if (!cell.safe) return <BasicCell {...props} />;

  return (
    <BasicCell {...props}>
      <SafeLabel orientation={cell.safe.labelOrientation} />
    </BasicCell>
  );
}
