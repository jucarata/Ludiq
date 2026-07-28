"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHouse, FaRankingStar, FaUser } from "react-icons/fa6";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { brandTitleFont } from "@/lib/fonts";

const PATH_COLORS = [
  "var(--brand-purple)",
  "var(--brand-coral)",
  "var(--brand-yellow)",
  "var(--brand-mint)",
  "var(--brand-turquoise)",
] as const;

function BrandPathStrip() {
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden shadow-[0_2px_0_rgba(0,0,0,0.25)]"
      aria-hidden
    >
      {PATH_COLORS.map((color) => (
        <span
          key={color}
          className="relative h-full flex-1 border-r border-white/25 last:border-r-0"
          style={{ backgroundColor: color }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 bg-white/20" />
        </span>
      ))}
    </div>
  );
}

function navButtonClassName(
  active: boolean,
  accent: "yellow" | "mint" | "turquoise",
) {
  const activeBg =
    accent === "yellow"
      ? "bg-[var(--brand-yellow)] text-[var(--brand-navy)]"
      : accent === "mint"
        ? "bg-[var(--brand-mint)] text-white"
        : "bg-[var(--brand-turquoise)] text-white";

  const base =
    "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[var(--brand-navy)] shadow-[0_5px_0_#0a0c2e] transition-[filter,background-color,color] duration-150 sm:h-[4.25rem] sm:w-[4.25rem] hover:brightness-105 active:brightness-95";

  if (active) {
    return `${base} ${activeBg}`;
  }

  return `${base} bg-[var(--brand-cream)] text-[var(--brand-navy)]`;
}

function labelClassName(active: boolean, accent: "yellow" | "mint" | "turquoise") {
  const activeColor =
    accent === "yellow"
      ? "text-[var(--brand-yellow)]"
      : accent === "mint"
        ? "text-[var(--brand-mint)]"
        : "text-[var(--brand-turquoise)]";

  return `${brandTitleFont.className} text-sm font-extrabold uppercase tracking-wide ${
    active ? activeColor : "text-[var(--brand-cream)]/55"
  }`;
}

export function AppFooter() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const isHome = pathname === "/" || pathname === "";
  const isProfile = pathname.startsWith("/profile");
  const isLeaderboard = pathname.startsWith("/leaderboard");

  return (
    <footer
      role="navigation"
      aria-label={t("nav.mainNavigation")}
      className="relative shrink-0 bg-[var(--brand-navy)] shadow-[0_-12px_32px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <BrandPathStrip />

      <div
        className="pointer-events-none absolute inset-x-0 top-2.5 h-16 bg-[radial-gradient(ellipse_at_50%_0%,rgba(106,61,243,0.35),transparent_70%)]"
        aria-hidden
      />

      <nav className="relative mx-auto flex h-[5.75rem] w-full max-w-sm items-center justify-center gap-3 px-4 sm:h-[6rem] sm:max-w-md sm:gap-4 sm:px-6">
        <Link
          href="/leaderboard"
          aria-label={t("nav.leaderboard")}
          aria-current={isLeaderboard ? "page" : undefined}
          className="flex flex-col items-center gap-1"
        >
          <span className={navButtonClassName(isLeaderboard, "yellow")}>
            <FaRankingStar className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </span>
          <span className={labelClassName(isLeaderboard, "yellow")}>
            {t("nav.leaderboardShort")}
          </span>
        </Link>

        <Link
          href="/"
          aria-label={t("nav.home")}
          aria-current={isHome ? "page" : undefined}
          className="flex flex-col items-center gap-1"
        >
          <span className={navButtonClassName(isHome, "mint")}>
            <FaHouse className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </span>
          <span className={labelClassName(isHome, "mint")}>{t("nav.home")}</span>
        </Link>

        <Link
          href="/profile"
          aria-label={t("nav.profile")}
          aria-current={isProfile ? "page" : undefined}
          className="flex flex-col items-center gap-1"
        >
          <span className={navButtonClassName(isProfile, "turquoise")}>
            <FaUser className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </span>
          <span className={labelClassName(isProfile, "turquoise")}>
            {t("nav.profile")}
          </span>
        </Link>
      </nav>
    </footer>
  );
}
