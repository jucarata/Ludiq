"use client";

import Link from "next/link";
import { FaGear, FaUser } from "react-icons/fa6";
import { useHomePlayOptional } from "@/components/home/HomePlayContext";
import {
  retroComingSoonButtonClassName,
  retroIconButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";

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
        <div className="relative flex items-center justify-center">
          {activeMode?.id === "offline" ? (
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
            aria-label="Settings"
            className={`${retroIconButtonClassName} absolute right-full mr-3`}
          >
            <FaGear className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </button>

          <button
            type="button"
            aria-label="Profile"
            className={`${retroIconButtonClassName} absolute left-full ml-3`}
          >
            <FaUser className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </button>
        </div>
      </nav>
    </footer>
  );
}
