"use client";

import { usePathname } from "next/navigation";
import { useHomePlayOptional } from "@/components/home/HomePlayContext";
import { retroActionFont } from "@/lib/fonts";

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
      <nav className="mx-auto flex h-20 w-full max-w-5xl items-center justify-center px-4 sm:px-6">
        {activeMode ? (
          <button
            type="button"
            aria-label={`Play ${activeMode.title}`}
            className={`${retroActionFont.className} flex h-14 min-w-[12.5rem] items-center justify-center rounded-xl border-[3px] border-[#173532] bg-[var(--board-green)] px-10 text-sm uppercase tracking-normal text-[var(--board-path)] shadow-[4px_4px_0_#173532] transition-[transform,box-shadow] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] sm:h-[3.75rem] sm:min-w-[14rem] sm:px-12 sm:text-base`}
          >
            Play
          </button>
        ) : null}
      </nav>
    </footer>
  );
}
