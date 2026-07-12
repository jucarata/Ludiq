import { Press_Start_2P } from "next/font/google";

export const retroActionFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
});

export const retroPlayButtonClassName = `${retroActionFont.className} flex h-14 min-w-[12.5rem] items-center justify-center rounded-xl border-[3px] border-[#173532] bg-[var(--board-green)] px-10 text-sm uppercase tracking-normal text-[var(--board-path)] shadow-[4px_4px_0_#173532] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0_#173532] sm:h-[3.75rem] sm:min-w-[14rem] sm:px-12 sm:text-base`;

export const retroComingSoonButtonClassName = `${retroActionFont.className} flex h-14 min-w-[12.5rem] cursor-not-allowed items-center justify-center rounded-xl border-[3px] border-[#5c5c78] bg-[#4a6670] px-6 text-[0.62rem] uppercase leading-tight tracking-normal text-[var(--board-path)]/80 shadow-[4px_4px_0_#2f3f47] sm:h-[3.75rem] sm:min-w-[14rem] sm:px-8 sm:text-xs`;

export const retroIconButtonClassName =
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-[3px] border-[#173532] bg-[var(--board-green)] text-[var(--board-path)] shadow-[4px_4px_0_#173532] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] sm:h-[3.75rem] sm:w-[3.75rem]";

export const retroIconButtonActiveClassName =
  "flex h-14 w-14 shrink-0 translate-x-0.5 translate-y-0.5 items-center justify-center rounded-xl border-[3px] border-[var(--board-blue-dark)] bg-[var(--board-blue)] text-[var(--board-path)] shadow-[2px_2px_0_var(--board-blue-dark)] sm:h-[3.75rem] sm:w-[3.75rem]";

export const retroBackButtonClassName = `${retroActionFont.className} flex h-14 min-w-[9rem] items-center justify-center rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] px-8 text-[0.62rem] uppercase tracking-normal text-[#173532] shadow-[4px_4px_0_#173532] transition-[transform,box-shadow,filter] duration-150 hover:brightness-95 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] sm:h-[3.75rem] sm:min-w-[10rem] sm:px-10 sm:text-xs`;

export const retroDangerButtonClassName = `${retroActionFont.className} flex h-14 min-w-[9rem] items-center justify-center rounded-xl border-[3px] border-[#5c1a1a] bg-[var(--board-red)] px-8 text-[0.62rem] uppercase tracking-normal text-[var(--board-path)] shadow-[4px_4px_0_#5c1a1a] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#5c1a1a] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0_#5c1a1a] sm:h-[3.75rem] sm:min-w-[10rem] sm:px-10 sm:text-xs`;

export const retroRoleSwitchClassName = `${retroActionFont.className} relative grid h-10 w-[11.5rem] shrink-0 grid-cols-2 overflow-hidden rounded-xl border-[3px] border-[#173532] bg-[#4a6670] p-1 shadow-[3px_3px_0_#173532] transition-[transform,box-shadow,filter] duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#173532] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[3px_3px_0_#173532] sm:h-11 sm:w-[12.5rem] sm:shadow-[4px_4px_0_#173532] sm:disabled:active:shadow-[4px_4px_0_#173532]`;

export const retroRoleSwitchThumbClassName =
  "pointer-events-none absolute top-1 bottom-1 rounded-lg border-2 border-[#173532] bg-[var(--board-green)] shadow-[2px_2px_0_#173532] transition-[left,width] duration-200 ease-out";

export const retroRoleSwitchLabelActiveClassName =
  "relative z-10 flex items-center justify-center text-[0.45rem] uppercase tracking-normal text-[var(--board-path)] sm:text-[0.5rem]";

export const retroRoleSwitchLabelInactiveClassName =
  "relative z-10 flex items-center justify-center text-[0.45rem] uppercase tracking-normal text-[var(--board-path)]/55 sm:text-[0.5rem]";
