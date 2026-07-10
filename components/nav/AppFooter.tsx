"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaRankingStar, FaUser } from "react-icons/fa6";
import { useHomePlayOptional } from "@/components/home/HomePlayContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  retroIconButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";

export function AppFooter() {
  const pathname = usePathname();
  const homePlay = useHomePlayOptional();
  const { t } = useTranslations();
  const activeMode = homePlay?.activeMode ?? null;
  const isHome = pathname === "/" || pathname === "";

  return (
    <footer
      role="navigation"
      aria-label={t("nav.mainNavigation")}
      className="flex h-[calc(5rem+env(safe-area-inset-bottom,0px))] shrink-0 items-stretch justify-center border-t border-[var(--board-path-border)] bg-[var(--board-path)] shadow-[0_-4px_20px_rgba(26,26,46,0.08)] sm:h-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <nav className="mx-auto flex h-20 w-full max-w-5xl items-center justify-center px-4 sm:px-6">
        <div className="relative flex items-center justify-center">
          {!isHome ? (
            <Link
              href="/"
              aria-label={t("nav.home")}
              className={retroPlayButtonClassName}
            >
              {t("nav.home")}
            </Link>
          ) : activeMode?.id === "offline" ? (
            <Link
              href="/play"
              aria-label={t("nav.playMode", { title: activeMode.title })}
              className={retroPlayButtonClassName}
            >
              {t("nav.play")}
            </Link>
          ) : activeMode?.id === "multiplayer" ? (
            <Link
              href="/multiplayer"
              aria-label={t("nav.playMode", { title: activeMode.title })}
              className={retroPlayButtonClassName}
            >
              {t("nav.play")}
            </Link>
          ) : (
            <span className="invisible flex h-14 min-w-[12.5rem] sm:h-[3.75rem] sm:min-w-[14rem]" aria-hidden />
          )}

          <button
            type="button"
            aria-label={t("nav.leaderboard")}
            className={`${retroIconButtonClassName} absolute right-full mr-3`}
          >
            <FaRankingStar className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </button>

          <Link
            href="/profile"
            aria-label={t("nav.profile")}
            className={`${retroIconButtonClassName} absolute left-full ml-3`}
          >
            <FaUser className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </Link>
        </div>
      </nav>
    </footer>
  );
}
