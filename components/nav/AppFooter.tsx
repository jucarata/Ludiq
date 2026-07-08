"use client";

import Link from "next/link";
import { useHomePlayOptional } from "@/components/home/HomePlayContext";
import { retroActionFont } from "@/lib/fonts";

const playButtonClassName = `${retroActionFont.className} flex h-14 min-w-[12.5rem] items-center justify-center rounded-xl border-[3px] border-[#173532] bg-[var(--board-green)] px-10 text-sm uppercase tracking-normal text-[var(--board-path)] shadow-[4px_4px_0_#173532] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] sm:h-[3.75rem] sm:min-w-[14rem] sm:px-12 sm:text-base`;

const comingSoonButtonClassName = `${retroActionFont.className} flex h-14 min-w-[12.5rem] cursor-not-allowed items-center justify-center rounded-xl border-[3px] border-[#5c5c78] bg-[#4a6670] px-6 text-[0.62rem] uppercase leading-tight tracking-normal text-[var(--board-path)]/80 shadow-[4px_4px_0_#2f3f47] sm:h-[3.75rem] sm:min-w-[14rem] sm:px-8 sm:text-xs`;

export function AppFooter() {
  const homePlay = useHomePlayOptional();
  const activeMode = homePlay?.activeMode ?? null;

  return (
    <footer
      role="navigation"
      aria-label="Main navigation"
      className="flex h-[calc(5rem+env(safe-area-inset-bottom,0px))] shrink-0 items-stretch justify-center border-t border-[var(--board-path-border)] bg-[var(--board-path)] shadow-[0_-4px_20px_rgba(26,26,46,0.08)] sm:h-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <nav className="mx-auto flex h-20 w-full max-w-5xl items-center justify-center px-4 sm:px-6">
        {activeMode?.id === "offline" ? (
          <Link
            href="/play"
            aria-label={`Play ${activeMode.title}`}
            className={playButtonClassName}
          >
            Play
          </Link>
        ) : activeMode?.id === "multiplayer" ? (
          <button
            type="button"
            aria-label="Multiplayer coming soon"
            disabled
            className={comingSoonButtonClassName}
          >
            Coming Soon
          </button>
        ) : null}
      </nav>
    </footer>
  );
}
