"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaRankingStar, FaUser } from "react-icons/fa6";
import { useHomePlayOptional } from "@/components/home/HomePlayContext";
import {
  retroComingSoonButtonClassName,
  retroIconButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";

export function AppFooter() {
  const pathname = usePathname();
  const homePlay = useHomePlayOptional();
  const activeMode = homePlay?.activeMode ?? null;
  const isHome = pathname === "/" || pathname === "";

  return (
    <footer
      role="navigation"
      aria-label="Main navigation"
      className="flex h-[calc(5rem+env(safe-area-inset-bottom,0px))] shrink-0 items-stretch justify-center border-t border-[var(--board-path-border)] bg-[var(--board-path)] shadow-[0_-4px_20px_rgba(26,26,46,0.08)] sm:h-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <nav className="mx-auto flex h-20 w-full max-w-5xl items-center justify-center px-4 sm:px-6">
        <div className="relative flex items-center justify-center">
          {!isHome ? (
            <Link
              href="/"
              aria-label="Home"
              className={retroPlayButtonClassName}
            >
              Home
            </Link>
          ) : activeMode?.id === "offline" ? (
            <Link
              href="/play"
              aria-label={`Play ${activeMode.title}`}
              className={retroPlayButtonClassName}
            >
              Play
            </Link>
          ) : activeMode?.id === "multiplayer" ? (
            <button
              type="button"
              aria-label="Multiplayer coming soon"
              disabled
              className={retroComingSoonButtonClassName}
            >
              Coming Soon
            </button>
          ) : (
            <span className="invisible flex h-14 min-w-[12.5rem] sm:h-[3.75rem] sm:min-w-[14rem]" aria-hidden />
          )}

          <button
            type="button"
            aria-label="Leaderboard"
            className={`${retroIconButtonClassName} absolute right-full mr-3`}
          >
            <FaRankingStar className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </button>

          <Link
            href="/profile"
            aria-label="Profile"
            className={`${retroIconButtonClassName} absolute left-full ml-3`}
          >
            <FaUser className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </Link>
        </div>
      </nav>
    </footer>
  );
}
