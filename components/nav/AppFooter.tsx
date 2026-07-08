"use client";

import { usePathname } from "next/navigation";
import { useHomePlayOptional } from "@/components/home/HomePlayContext";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function isHomePath(pathname: string) {
  if (pathname === "/") return true;
  if (!basePath) return false;
  return pathname === basePath || pathname === `${basePath}/`;
}

export function AppFooter() {
  const pathname = usePathname();
  const homePlay = useHomePlayOptional();
  const isHome = isHomePath(pathname);
  const activeMode = isHome ? homePlay?.activeMode : null;

  return (
    <footer
      role="navigation"
      aria-label="Main navigation"
      className="flex h-[calc(5rem+env(safe-area-inset-bottom,0px))] shrink-0 items-stretch justify-center border-t border-[var(--board-path-border)] bg-[var(--board-path)] shadow-[0_-4px_20px_rgba(26,26,46,0.08)] sm:h-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <nav className="mx-auto flex h-20 w-full max-w-5xl items-stretch justify-center px-4 sm:px-6">
        {activeMode ? (
          <button
            type="button"
            aria-label={`Play ${activeMode.title}`}
            className="min-w-[8.75rem] self-stretch rounded-[1.25rem] bg-[var(--board-green)] px-10 text-lg font-bold uppercase tracking-widest text-[var(--board-path)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_10px_rgba(38,70,83,0.18)] transition-transform hover:bg-[var(--board-green-dark)] active:scale-[0.98] sm:min-w-[9.5rem] sm:px-12 sm:text-xl"
          >
            Play
          </button>
        ) : null}
      </nav>
    </footer>
  );
}
