import { Baloo_2, Nunito } from "next/font/google";

/** Brand display font — titles, mode labels, primary CTAs (Baloo 2 ExtraBold) */
export const brandTitleFont = Baloo_2({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-baloo",
});

/** Brand body font — readable UI copy (Nunito) */
export const brandBodyFont = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito",
});

/** Titles / CTAs — Baloo 2 (alias kept for existing imports) */
export const retroActionFont = brandTitleFont;

/** Primary CTA — Verde Juego, forma chunky original */
export const brandPlayButtonClassName = `${brandTitleFont.className} flex h-14 min-w-[12.5rem] items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-mint)] px-10 text-lg font-extrabold uppercase tracking-wide text-white shadow-[4px_4px_0_var(--brand-navy)] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0_var(--brand-navy)] sm:h-[3.75rem] sm:min-w-[14rem] sm:px-12 sm:text-xl`;

/** Secondary CTA — Azul Party */
export const brandSecondaryButtonClassName = `${brandTitleFont.className} flex h-14 min-w-[12.5rem] items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-turquoise)] px-10 text-lg font-extrabold uppercase tracking-wide text-white shadow-[4px_4px_0_var(--brand-navy)] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0_var(--brand-navy)] sm:h-[3.75rem] sm:min-w-[14rem] sm:px-12 sm:text-xl`;

/** Neutral / back — cream */
export const brandBackButtonClassName = `${brandTitleFont.className} flex h-14 min-w-[9rem] items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] px-8 text-base font-extrabold uppercase tracking-wide text-[var(--brand-navy)] shadow-[4px_4px_0_var(--brand-navy)] transition-[transform,box-shadow,filter] duration-150 hover:brightness-95 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] sm:h-[3.75rem] sm:min-w-[10rem] sm:px-10 sm:text-lg`;

/** Destructive — Rojo Coral */
export const brandDangerButtonClassName = `${brandTitleFont.className} flex h-14 min-w-[9rem] items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-coral)] px-8 text-base font-extrabold uppercase tracking-wide text-white shadow-[4px_4px_0_var(--brand-navy)] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0_var(--brand-navy)] sm:h-[3.75rem] sm:min-w-[10rem] sm:px-10 sm:text-lg`;

export const brandRoleSwitchClassName = `${brandTitleFont.className} relative grid h-10 w-[11.5rem] shrink-0 grid-cols-2 overflow-hidden rounded-xl border-[3px] border-[var(--brand-navy)] bg-[#3a3d6e] p-1 shadow-[3px_3px_0_var(--brand-navy)] transition-[transform,box-shadow,filter] duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[3px_3px_0_var(--brand-navy)] sm:h-11 sm:w-[12.5rem] sm:shadow-[4px_4px_0_var(--brand-navy)] sm:disabled:active:shadow-[4px_4px_0_var(--brand-navy)]`;

export const brandRoleSwitchThumbClassName =
  "pointer-events-none absolute top-1 bottom-1 rounded-lg border-2 border-[var(--brand-navy)] bg-[var(--brand-mint)] shadow-[2px_2px_0_var(--brand-navy)] transition-[left,width] duration-200 ease-out";

export const brandRoleSwitchLabelActiveClassName =
  "relative z-10 flex items-center justify-center text-xs font-extrabold uppercase tracking-wide text-white sm:text-sm";

export const brandRoleSwitchLabelInactiveClassName =
  "relative z-10 flex items-center justify-center text-xs font-bold uppercase tracking-wide text-white/55 sm:text-sm";

/* ---- Backward-compatible aliases ---- */
export const retroPlayButtonClassName = brandPlayButtonClassName;
export const retroBackButtonClassName = brandBackButtonClassName;
export const retroDangerButtonClassName = brandDangerButtonClassName;
export const retroRoleSwitchClassName = brandRoleSwitchClassName;
export const retroRoleSwitchThumbClassName = brandRoleSwitchThumbClassName;
export const retroRoleSwitchLabelActiveClassName =
  brandRoleSwitchLabelActiveClassName;
export const retroRoleSwitchLabelInactiveClassName =
  brandRoleSwitchLabelInactiveClassName;
