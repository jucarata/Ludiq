import { DieFace } from "@/components/dice/DieFace";

interface DicePairVisualProps {
  className?: string;
  sizeClass?: string;
  gapClass?: string;
}

export function DicePairVisual({
  className = "",
  sizeClass = "h-14 w-14 md:h-16 md:w-16",
  gapClass = "gap-2",
}: DicePairVisualProps) {
  return (
    <div className={`flex items-center ${gapClass} ${className}`} aria-hidden>
      <DieFace value={3} className={sizeClass} />
      <DieFace value={5} className={sizeClass} />
    </div>
  );
}
