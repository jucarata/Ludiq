"use client";

type PiggyBankProps = {
  className?: string;
  /** How many coins to show inside (1–6). */
  coinCount?: number;
};

/**
 * Clear fat piggy bank with coins visible through the plastic —
 * used as the competitive pot visual in the room lobby.
 */
export function PiggyBank({ className, coinCount = 4 }: PiggyBankProps) {
  const coins = Math.min(6, Math.max(1, coinCount));

  return (
    <svg
      viewBox="0 0 160 140"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="piggy-body" x1="20" y1="20" x2="140" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c8ecf5" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#9fd4e4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6bb8cc" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="piggy-shine" x1="40" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="coin-face" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffe566" />
          <stop offset="0.5" stopColor="#f5c518" />
          <stop offset="1" stopColor="#d4a017" />
        </linearGradient>
        <clipPath id="piggy-clip">
          <ellipse cx="82" cy="78" rx="52" ry="40" />
        </clipPath>
        <filter id="piggy-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#173532" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Shadow */}
      <ellipse cx="82" cy="128" rx="38" ry="6" fill="#173532" opacity="0.18" />

      <g filter="url(#piggy-soft)">
        {/* Legs */}
        <ellipse cx="52" cy="112" rx="9" ry="7" fill="url(#piggy-body)" stroke="#5a9aab" strokeWidth="2" />
        <ellipse cx="72" cy="114" rx="9" ry="7" fill="url(#piggy-body)" stroke="#5a9aab" strokeWidth="2" />
        <ellipse cx="96" cy="114" rx="9" ry="7" fill="url(#piggy-body)" stroke="#5a9aab" strokeWidth="2" />
        <ellipse cx="116" cy="112" rx="9" ry="7" fill="url(#piggy-body)" stroke="#5a9aab" strokeWidth="2" />

        {/* Ear left */}
        <path
          d="M42 52c-6-14 4-24 14-18 4 2 6 8 5 14"
          fill="url(#piggy-body)"
          stroke="#5a9aab"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Ear right */}
        <path
          d="M108 48c8-14 22-10 20 2-1 6-6 10-12 11"
          fill="url(#piggy-body)"
          stroke="#5a9aab"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Body (glass) */}
        <ellipse
          cx="82"
          cy="78"
          rx="54"
          ry="42"
          fill="url(#piggy-body)"
          stroke="#4f8fa0"
          strokeWidth="2.5"
        />

        {/* Coins clipped inside body */}
        <g clipPath="url(#piggy-clip)">
          {Array.from({ length: coins }, (_, i) => {
            const x = 58 + (i % 3) * 18 + (i > 2 ? 8 : 0);
            const y = 88 - Math.floor(i / 3) * 14 - (i % 2) * 3;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <ellipse cx="0" cy="2" rx="11" ry="4.5" fill="#b8860b" opacity="0.45" />
                <ellipse cx="0" cy="0" rx="11" ry="4.5" fill="url(#coin-face)" stroke="#a67c00" strokeWidth="1" />
                <ellipse cx="0" cy="-1" rx="7" ry="2.8" fill="#fff3a0" opacity="0.35" />
                <text
                  x="0"
                  y="1.5"
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="700"
                  fill="#8a6a00"
                  opacity="0.7"
                >
                  $
                </text>
              </g>
            );
          })}
        </g>

        {/* Glass shine on top of coins */}
        <ellipse cx="82" cy="78" rx="54" ry="42" fill="url(#piggy-shine)" />
        <path
          d="M48 58c8-16 28-22 44-16"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* Coin slot */}
        <rect
          x="68"
          y="42"
          width="28"
          height="5"
          rx="2.5"
          fill="#2a4a55"
          stroke="#3d6a78"
          strokeWidth="1"
        />

        {/* Snout */}
        <ellipse
          cx="128"
          cy="82"
          rx="16"
          ry="13"
          fill="url(#piggy-body)"
          stroke="#4f8fa0"
          strokeWidth="2.5"
        />
        <ellipse cx="134" cy="80" rx="2.2" ry="3.2" fill="#3d6a78" opacity="0.7" />
        <ellipse cx="134" cy="88" rx="2.2" ry="3.2" fill="#3d6a78" opacity="0.7" />

        {/* Eye */}
        <circle cx="104" cy="66" r="5" fill="#173532" />
        <circle cx="105.5" cy="64.5" r="1.6" fill="#ffffff" />

        {/* Tail */}
        <path
          d="M30 78c-8 2-12 10-8 14 4 4 10 0 8-4"
          stroke="#4f8fa0"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
