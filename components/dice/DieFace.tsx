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

export interface DieFaceProps {
  /** 1–6 shows dots, null shows a "?" placeholder. */
  value?: number | null;
  className?: string;
}

/** Cara de dado plana (2D) con puntos del 1 al 6 */
export function DieFace({ value = 5, className = "h-12 w-12" }: DieFaceProps) {
  const dots = value != null ? (DOT_LAYOUT[value] ?? DOT_LAYOUT[5]) : null;

  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="16"
        fill="#fefae0"
        stroke="#d4c5a0"
        strokeWidth="4"
      />
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="13"
        fill="#fffef8"
        stroke="#e8dcc0"
        strokeWidth="1.5"
      />
      {dots
        ? dots.map(([cx, cy], index) => (
            <circle key={index} cx={cx} cy={cy} r="8" fill="#2a2a3e" />
          ))
        : (
            <text
              x="50"
              y="58"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="42"
              fontWeight="bold"
              fill="#2a2a3e"
            >
              ?
            </text>
          )}
    </svg>
  );
}
