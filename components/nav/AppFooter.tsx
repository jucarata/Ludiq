"use client";

import Link from "next/link";
import { FaUser } from "react-icons/fa6";
import { useHomePlayOptional } from "@/components/home/HomePlayContext";
import {
  retroComingSoonButtonClassName,
  retroPlayButtonClassName,
  retroProfileButtonClassName,
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
        <div className="flex items-center gap-3">
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
          ) : null}

          <button
            type="button"
            aria-label="Profile"
            className={retroProfileButtonClassName}
          >
            <FaUser className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </button>
        </div>
      </nav>
    </footer>
  );
}
