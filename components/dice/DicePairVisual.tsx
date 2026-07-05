import { Die3D, getFaceRotation } from "@/components/dice/Die3D";

/** Orientación de la cara con una inclinación leve para que se vean las caras laterales. */
function tiltedOrientation(value: number, tiltY: number): string {
  const face = getFaceRotation(value);
  return `rotateX(${face.x - 20}deg) rotateY(${face.y + tiltY}deg)`;
}

interface DicePairVisualProps {
  className?: string;
  sizePx?: number;
  gapClass?: string;
}

export function DicePairVisual({
  className = "",
  sizePx = 56,
  gapClass = "gap-2",
}: DicePairVisualProps) {
  return (
    <div className={`flex items-center ${gapClass} ${className}`} aria-hidden>
      <Die3D sizePx={sizePx} orientation={tiltedOrientation(3, -26)} />
      <Die3D sizePx={sizePx} orientation={tiltedOrientation(5, 26)} />
    </div>
  );
}
