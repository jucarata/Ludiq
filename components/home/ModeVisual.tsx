"use client";

import type { ReactNode } from "react";
import { FaHeart, FaStar } from "react-icons/fa6";
import { DieFace } from "@/components/dice/DieFace";
import { brandTitleFont } from "@/lib/fonts";

export type GameModeId = "versus" | "friends" | "practice";

export const MODE_BACKGROUNDS: Record<GameModeId, string> = {
  versus: `
    radial-gradient(circle at 50% 30%, rgba(255,200,11,0.28), transparent 50%),
    linear-gradient(165deg, #FF4B6E 0%, #E63946 42%, #9B1C2E 100%)
  `,
  friends: `
    radial-gradient(circle at 50% 30%, rgba(255,255,255,0.22), transparent 50%),
    linear-gradient(165deg, #3DDB86 0%, #2ECC71 42%, #1B8A4A 100%)
  `,
  practice: `
    radial-gradient(circle at 50% 30%, rgba(255,255,255,0.28), transparent 50%),
    linear-gradient(165deg, #FFD84A 0%, #FFC800 42%, #D97706 100%)
  `,
};

export const MODE_SCRIMS: Record<GameModeId, string> = {
  versus: "bg-gradient-to-t from-[#7A1524] via-[#7A1524]/50 to-transparent",
  friends: "bg-gradient-to-t from-[#0F5C32] via-[#0F5C32]/50 to-transparent",
  practice: "bg-gradient-to-t from-[#8A4B08] via-[#8A4B08]/50 to-transparent",
};

export const MODE_ACCENTS: Record<GameModeId, string> = {
  versus: "#FF4B6E",
  friends: "#2ECC71",
  practice: "#FFC800",
};

function ModeBadgeShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[9.5rem] w-[11.5rem] flex-col items-center justify-center sm:h-[11.5rem] sm:w-[13.5rem]">
      {children}
    </div>
  );
}

function MiniBoardBackdrop() {
  return (
    <div
      className="absolute left-1/2 top-[6%] h-[72%] w-[78%] -translate-x-1/2 overflow-hidden rounded-2xl border-[3px] border-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
      style={{ backgroundColor: "#FFF8F0" }}
      aria-hidden
    >
      <div className="absolute left-1/2 top-[10%] h-[80%] w-[24%] -translate-x-1/2 rounded-sm bg-[#EDE6D8]" />
      <div className="absolute left-[10%] top-1/2 h-[24%] w-[80%] -translate-y-1/2 rounded-sm bg-[#EDE6D8]" />
      <span className="absolute left-[8%] top-[8%] h-[30%] w-[30%] rounded-md bg-[#FF4B6E]" />
      <span className="absolute right-[8%] top-[8%] h-[30%] w-[30%] rounded-md bg-[#FFC800]" />
      <span className="absolute bottom-[8%] left-[8%] h-[30%] w-[30%] rounded-md bg-[#2ECC71]" />
      <span className="absolute bottom-[8%] right-[8%] h-[30%] w-[30%] rounded-md bg-[#00C2FF]" />
      <span className="absolute left-1/2 top-1/2 h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#6A3DF3]" />
    </div>
  );
}

function SoftGlow({ color }: { color: string }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[42%] h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
      style={{
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
      }}
      aria-hidden
    />
  );
}

function VersusStickerText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`${brandTitleFont.className} relative inline-block font-extrabold leading-none ${className ?? ""}`}
      style={{
        color: "#6A3DF3",
        WebkitTextStroke: "0.12em #FFC800",
        paintOrder: "stroke fill",
        textShadow:
          "0 0.08em 0 #B45309, 0 0.14em 0 #14174D, 0 0.22em 0.18em rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </span>
  );
}

function VersusBadge() {
  return (
    <ModeBadgeShell>
      <MiniBoardBackdrop />
      <SoftGlow color="rgba(255,200,11,0.45)" />

      <div className="relative z-10 flex items-end justify-center gap-0.5 sm:gap-1">
        <VersusStickerText className="-rotate-6 text-[3.4rem] sm:text-[4.1rem]">
          1
        </VersusStickerText>
        <VersusStickerText className="mb-1 text-[2.55rem] sm:mb-1.5 sm:text-[3.1rem]">
          VS
        </VersusStickerText>
        <VersusStickerText className="rotate-6 text-[3.4rem] sm:text-[4.1rem]">
          1
        </VersusStickerText>
      </div>

      <div className="relative z-10 mt-1 flex items-end gap-1 sm:mt-1.5 sm:gap-1.5">
        <DieFace
          value={2}
          className="h-7 w-7 -rotate-12 drop-shadow-[0_3px_0_rgba(20,23,77,0.45)] sm:h-8 sm:w-8"
        />
        <DieFace
          value={5}
          className="h-7 w-7 -translate-y-1 rotate-6 drop-shadow-[0_3px_0_rgba(20,23,77,0.45)] sm:h-8 sm:w-8"
        />
        <DieFace
          value={1}
          className="h-7 w-7 rotate-[14deg] drop-shadow-[0_3px_0_rgba(20,23,77,0.45)] sm:h-8 sm:w-8"
        />
      </div>
    </ModeBadgeShell>
  );
}

function FriendsBadge() {
  return (
    <ModeBadgeShell>
      <MiniBoardBackdrop />
      <SoftGlow color="rgba(255,255,255,0.4)" />

      <div className="relative z-10 flex items-center justify-center">
        <FaHeart
          className="absolute -left-7 top-2 h-8 w-8 -rotate-[18deg] text-[#FF4B6E] drop-shadow-[0_3px_0_rgba(20,23,77,0.4)] sm:-left-8 sm:h-9 sm:w-9"
          aria-hidden
        />
        <FaHeart
          className="h-[4.25rem] w-[4.25rem] text-white drop-shadow-[0_5px_0_rgba(20,23,77,0.45)] sm:h-[5rem] sm:w-[5rem]"
          style={{
            filter: "drop-shadow(0 0 0.15rem #FFC800)",
          }}
          aria-hidden
        />
        <FaHeart
          className="absolute -right-7 bottom-1 h-8 w-8 rotate-[16deg] text-[#00C2FF] drop-shadow-[0_3px_0_rgba(20,23,77,0.4)] sm:-right-8 sm:h-9 sm:w-9"
          aria-hidden
        />
      </div>
    </ModeBadgeShell>
  );
}

function PracticeBadge() {
  return (
    <ModeBadgeShell>
      <MiniBoardBackdrop />
      <SoftGlow color="rgba(255,255,255,0.42)" />

      <div className="relative z-10 flex items-center justify-center">
        <DieFace
          value={5}
          className="h-[4.1rem] w-[4.1rem] -rotate-12 drop-shadow-[0_6px_0_rgba(20,23,77,0.4)] sm:h-[4.75rem] sm:w-[4.75rem]"
        />
        <DieFace
          value={2}
          className="absolute left-[52%] top-[8%] h-[3.4rem] w-[3.4rem] rotate-[18deg] drop-shadow-[0_5px_0_rgba(20,23,77,0.4)] sm:h-[4rem] sm:w-[4rem]"
        />
      </div>

      <div className="relative z-10 mt-1.5 flex items-center gap-1.5 sm:mt-2">
        <FaStar
          className="h-5 w-5 -rotate-12 text-white drop-shadow-[0_2px_0_rgba(20,23,77,0.4)] sm:h-6 sm:w-6"
          aria-hidden
        />
        <span
          className={`${brandTitleFont.className} text-[1.35rem] font-extrabold leading-none tracking-wide text-white sm:text-[1.55rem]`}
          style={{
            WebkitTextStroke: "0.06em #14174D",
            paintOrder: "stroke fill",
            textShadow: "0 0.1em 0 rgba(20,23,77,0.45)",
          }}
        >
          SOLO
        </span>
        <FaStar
          className="h-5 w-5 rotate-12 text-white drop-shadow-[0_2px_0_rgba(20,23,77,0.4)] sm:h-6 sm:w-6"
          aria-hidden
        />
      </div>
    </ModeBadgeShell>
  );
}

function ModeBadge({ modeId }: { modeId: GameModeId }) {
  if (modeId === "versus") return <VersusBadge />;
  if (modeId === "friends") return <FriendsBadge />;
  return <PracticeBadge />;
}

/** Full-bleed mode art used inside home carousel cards. */
export function ModeArt({ modeId }: { modeId: GameModeId }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-5">
      <div
        className="absolute inset-0"
        style={{ background: MODE_BACKGROUNDS[modeId] }}
      />
      <div className="relative z-10">
        <ModeBadge modeId={modeId} />
      </div>
    </div>
  );
}

/** Compact thumbnail of the same mode art for tutorial / lists. */
export function ModeThumb({
  modeId,
  comingSoon,
}: {
  modeId: GameModeId;
  comingSoon?: string;
}) {
  return (
    <div
      className="relative h-[3.75rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[0.85rem] border-[3px] border-[var(--brand-navy)]"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{ background: MODE_BACKGROUNDS[modeId] }}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.36]">
        <ModeBadge modeId={modeId} />
      </div>
      <div
        className={`pointer-events-none absolute inset-0 ${MODE_SCRIMS[modeId]}`}
      />
      {comingSoon ? (
        <span className="absolute inset-x-0.5 top-0.5 z-10 truncate rounded-md border border-[var(--brand-navy)] bg-[var(--brand-cream)] px-1 py-px text-center text-[0.4rem] font-extrabold uppercase tracking-wide text-[var(--brand-navy)]/70 shadow-sm">
          {comingSoon}
        </span>
      ) : null}
    </div>
  );
}
