/** Patrón floral ornamental simétrico para la casilla de victoria */
export function VictoryFloralPattern() {
  return (
    <svg
      className="victory-floral pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="victory-ornament-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8e7" />
          <stop offset="50%" stopColor="#fefae0" />
          <stop offset="100%" stopColor="#b8a078" />
        </linearGradient>
        <linearGradient id="victory-ornament-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fefae0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#9a8468" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="victory-center-vignette" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2d2016" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#2d2016" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#2d2016" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill="url(#victory-center-vignette)" />

      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="2.5"
        fill="none"
        stroke="url(#victory-ornament-stroke)"
        strokeWidth="1"
        opacity="0.75"
      />
      <rect
        x="8.5"
        y="8.5"
        width="83"
        height="83"
        rx="2"
        fill="none"
        stroke="url(#victory-ornament-stroke)"
        strokeWidth="0.45"
        opacity="0.35"
      />

      {/* Anillo de pétalos alrededor del centro */}
      <g transform="translate(50 50)" fill="url(#victory-ornament-fill)" stroke="url(#victory-ornament-stroke)" strokeWidth="0.35">
        {Array.from({ length: 16 }, (_, i) => (
          <ellipse
            key={`outer-petal-${i}`}
            cx="0"
            cy="-22"
            rx="2.6"
            ry="6.5"
            transform={`rotate(${i * 22.5})`}
            opacity="0.55"
          />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse
            key={`inner-petal-${i}`}
            cx="0"
            cy="-16"
            rx="2.8"
            ry="6"
            transform={`rotate(${i * 30 + 15})`}
            opacity="0.75"
          />
        ))}
        <circle r="12.5" fill="rgba(35,25,18,0.55)" stroke="url(#victory-ornament-stroke)" strokeWidth="0.55" />
        <circle r="9" fill="none" stroke="url(#victory-ornament-stroke)" strokeWidth="0.4" opacity="0.5" />
      </g>

      {/* Cuatro ramas florales principales */}
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`translate(50 50) rotate(${angle})`}>
          <FloralBranch />
        </g>
      ))}

      {/* Flores secundarias en diagonal */}
      {[45, 135, 225, 315].map((angle) => (
        <g key={`diag-${angle}`} transform={`translate(50 50) rotate(${angle})`}>
          <DiagonalFloret />
        </g>
      ))}

      {/* Adornos de esquina */}
      {[0, 90, 180, 270].map((angle) => (
        <g key={`corner-${angle}`} transform={`translate(50 50) rotate(${angle}) translate(-50 -50)`}>
          <CornerOrnament />
        </g>
      ))}
    </svg>
  );
}

function FloralBranch() {
  return (
    <g fill="url(#victory-ornament-fill)" stroke="url(#victory-ornament-stroke)" strokeWidth="0.35" opacity="0.82">
      <path
        d="M 0 13 C 5 14, 9 19, 12 24 C 16 21, 21 18, 28 20 C 24 23, 18 26, 12 28"
        fill="none"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <path
        d="M 0 13 C -5 14, -9 19, -12 24 C -16 21, -21 18, -28 20 C -24 23, -18 26, -12 28"
        fill="none"
        strokeWidth="0.6"
        strokeLinecap="round"
      />

      <path d="M 8 18 C 11 16, 14 18, 13 22 C 10 21, 8 18 Z" />
      <path d="M -8 18 C -11 16, -14 18, -13 22 C -10 21, -8 18 Z" />
      <path d="M 18 22 C 21 20, 24 23, 22 27 C 19 26, 18 22 Z" />
      <path d="M -18 22 C -21 20, -24 23, -22 27 C -19 26, -18 22 Z" />
      <path d="M 0 13 C 2.5 9, 7 7, 11 9 C 9 12, 4 13, 0 13 Z" opacity="0.7" />
      <path d="M 0 13 C -2.5 9, -7 7, -11 9 C -9 12, -4 13, 0 13 Z" opacity="0.7" />

      <circle cx="12" cy="26" r="1.5" fill="#fefae0" stroke="none" />
      <circle cx="-12" cy="26" r="1.5" fill="#fefae0" stroke="none" />
      <circle cx="0" cy="30" r="1.2" fill="#d4c5a0" stroke="none" opacity="0.9" />
    </g>
  );
}

function DiagonalFloret() {
  return (
    <g fill="url(#victory-ornament-fill)" stroke="url(#victory-ornament-stroke)" strokeWidth="0.3" opacity="0.65">
      <path
        d="M 0 20 C 3 22, 5 26, 4 30"
        fill="none"
        strokeWidth="0.45"
        strokeLinecap="round"
      />
      <path d="M 2 24 C 4 23, 6 25, 5 27 C 3 27, 2 24 Z" />
      <path d="M -2 24 C -4 23, -6 25, -5 27 C -3 27, -2 24 Z" />
      <circle cx="4" cy="30" r="1.1" fill="#fefae0" stroke="none" />
    </g>
  );
}

function CornerOrnament() {
  return (
    <g fill="url(#victory-ornament-fill)" stroke="url(#victory-ornament-stroke)" strokeWidth="0.35" opacity="0.75">
      <path
        d="M 10 10 C 10 17, 17 10, 25 10 C 17 12, 12 17, 10 25 C 10 17, 17 12, 25 10"
        fill="none"
        strokeWidth="0.55"
        strokeLinecap="round"
      />
      <path d="M 13 13 C 15 11, 18 13, 17 16 C 14 15, 13 13 Z" />
      <path d="M 19 10 C 21 9, 23 11, 21 13 C 19 12, 19 10 Z" />
      <path d="M 10 19 C 9 21, 11 23, 13 21 C 12 19, 10 19 Z" />
      <circle cx="10" cy="10" r="1.3" fill="#fefae0" stroke="none" />
    </g>
  );
}
