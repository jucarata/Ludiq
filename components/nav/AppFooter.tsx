"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaCircleQuestion,
  FaHouse,
  FaRankingStar,
  FaStore,
  FaUser,
} from "react-icons/fa6";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { brandTitleFont } from "@/lib/fonts";

const PATH_COLORS = [
  "var(--brand-purple)",
  "var(--brand-coral)",
  "var(--brand-yellow)",
  "var(--brand-mint)",
  "var(--brand-turquoise)",
] as const;

type NavAccent = "yellow" | "coral" | "mint" | "turquoise" | "purple";

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

function accentActiveBg(accent: NavAccent) {
  switch (accent) {
    case "yellow":
      return "bg-[var(--brand-yellow)] text-[var(--brand-navy)]";
    case "coral":
      return "bg-[var(--brand-coral)] text-white";
    case "mint":
      return "bg-[var(--brand-mint)] text-white";
    case "turquoise":
      return "bg-[var(--brand-turquoise)] text-white";
    case "purple":
      return "bg-[var(--brand-purple)] text-white";
  }
}

function accentActiveText(accent: NavAccent) {
  switch (accent) {
    case "yellow":
      return "text-[var(--brand-yellow)]";
    case "coral":
      return "text-[var(--brand-coral)]";
    case "mint":
      return "text-[var(--brand-mint)]";
    case "turquoise":
      return "text-[var(--brand-turquoise)]";
    case "purple":
      return "text-[var(--brand-purple)]";
  }
}

function navButtonClassName(active: boolean, accent: NavAccent, disabled = false) {
  const base =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[var(--brand-navy)] shadow-[0_4px_0_#0a0c2e] transition-[filter,background-color,color] duration-150 sm:h-14 sm:w-14";

  if (disabled) {
    return `${base} cursor-not-allowed bg-[var(--brand-cream)] text-[var(--brand-navy)] opacity-45`;
  }

  const interactive =
    "hover:brightness-105 active:brightness-95";

  if (active) {
    return `${base} ${interactive} ${accentActiveBg(accent)}`;
  }

  return `${base} ${interactive} bg-[var(--brand-cream)] text-[var(--brand-navy)]`;
}

function labelClassName(active: boolean, accent: NavAccent, disabled = false) {
  return `${brandTitleFont.className} text-[0.65rem] font-extrabold uppercase tracking-wide sm:text-xs ${
    disabled
      ? "text-[var(--brand-cream)]/35"
      : active
        ? accentActiveText(accent)
        : "text-[var(--brand-cream)]/55"
  }`;
}

function DisabledNavItem({
  accent,
  label,
  ariaLabel,
  children,
}: {
  accent: NavAccent;
  label: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const { t } = useTranslations();

  return (
    <span
      role="link"
      aria-disabled="true"
      aria-label={`${ariaLabel}. ${t("nav.comingSoon")}`}
      className="flex flex-col items-center gap-1"
    >
      <span className={navButtonClassName(false, accent, true)}>{children}</span>
      <span className={labelClassName(false, accent, true)}>{label}</span>
    </span>
  );
}

export function AppFooter() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const isHome = pathname === "/" || pathname === "";
  const isProfile = pathname.startsWith("/profile");
  const isHelp = pathname.startsWith("/help");
  const isShop = pathname.startsWith("/shop");

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

      <nav className="relative mx-auto flex h-[5.75rem] w-full max-w-md items-center justify-center gap-1.5 px-3 sm:h-[6rem] sm:max-w-lg sm:gap-2.5 sm:px-5">
        <DisabledNavItem
          accent="yellow"
          label={t("nav.leaderboardShort")}
          ariaLabel={t("nav.leaderboard")}
        >
          <FaRankingStar className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </DisabledNavItem>

        <Link
          href="/shop"
          aria-label={t("nav.shop")}
          aria-current={isShop ? "page" : undefined}
          className="flex flex-col items-center gap-1"
        >
          <span className={navButtonClassName(isShop, "coral")}>
            <FaStore className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </span>
          <span className={labelClassName(isShop, "coral")}>
            {t("nav.shop")}
          </span>
        </Link>

        <Link
          href="/"
          aria-label={t("nav.home")}
          aria-current={isHome ? "page" : undefined}
          className="flex flex-col items-center gap-1"
        >
          <span className={navButtonClassName(isHome, "mint")}>
            <FaHouse className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
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
            <FaUser className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </span>
          <span className={labelClassName(isProfile, "turquoise")}>
            {t("nav.profile")}
          </span>
        </Link>

        <Link
          href="/help"
          aria-label={t("nav.help")}
          aria-current={isHelp ? "page" : undefined}
          className="flex flex-col items-center gap-1"
        >
          <span className={navButtonClassName(isHelp, "purple")}>
            <FaCircleQuestion className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </span>
          <span className={labelClassName(isHelp, "purple")}>
            {t("nav.help")}
          </span>
        </Link>
      </nav>
    </footer>
  );
}
