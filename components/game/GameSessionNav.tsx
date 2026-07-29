"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaArrowRightFromBracket } from "react-icons/fa6";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { useOptionalInGameTutorial } from "@/components/tutorial/InGameTutorialContext";
import {
  brandBackButtonClassName,
  brandBodyFont,
  brandDangerButtonClassName,
  brandTitleFont,
} from "@/lib/fonts";

const PATH_COLORS = [
  "var(--brand-purple)",
  "var(--brand-coral)",
  "var(--brand-yellow)",
  "var(--brand-mint)",
  "var(--brand-turquoise)",
] as const;

type GameSessionNavProps = {
  onExit: () => void;
};

/**
 * Exit chrome for local / tutorial matches only.
 * Mobile: top bar, exit on the left (icon + label horizontal).
 * Desktop: vertical rail on the right (icon above label).
 * During guided tutorial steps, exit is fully disabled until "A jugar".
 */
export function GameSessionNav({ onExit }: GameSessionNavProps) {
  const { t } = useTranslations();
  const tutorial = useOptionalInGameTutorial();
  const exitLocked = !!tutorial?.active;
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (exitLocked) setConfirmOpen(false);
  }, [exitLocked]);

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    onExit();
  };

  return (
    <>
      <aside
        className="order-first flex shrink-0 flex-col bg-[var(--brand-navy)] shadow-[0_8px_24px_rgba(0,0,0,0.28)] md:order-last md:flex-row md:shadow-[-8px_0_24px_rgba(0,0,0,0.28)]"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
        aria-label={t("gameSession.navLabel")}
      >
        <div
          className="order-last flex h-1.5 w-full overflow-hidden md:order-first md:h-auto md:w-1.5 md:flex-col"
          aria-hidden
        >
          {PATH_COLORS.map((color) => (
            <span
              key={color}
              className="h-full flex-1 md:h-auto md:w-full md:flex-1"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="order-first flex h-12 w-full items-center justify-start gap-2 px-2.5 sm:h-14 sm:px-3 md:order-last md:h-auto md:w-[4.25rem] md:flex-1 md:flex-col md:justify-start md:gap-3 md:px-2 md:py-4">
          <button
            type="button"
            disabled={exitLocked}
            onClick={
              exitLocked
                ? undefined
                : () => {
                    setConfirmOpen(true);
                  }
            }
            aria-label={
              exitLocked
                ? t("gameSession.exitLockedAria")
                : t("gameSession.exitAria")
            }
            title={exitLocked ? t("gameSession.exitLockedAria") : undefined}
            className={`flex flex-row items-center gap-2 md:flex-col md:gap-0.5 ${
              exitLocked
                ? "pointer-events-none cursor-not-allowed opacity-35"
                : ""
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-coral)] text-white shadow-[0_4px_0_#0a0c2e] sm:h-11 sm:w-11 md:h-12 md:w-12 ${
                exitLocked
                  ? ""
                  : "transition-[filter,transform] duration-150 hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_#0a0c2e]"
              }`}
            >
              <FaArrowRightFromBracket
                className="h-4 w-4 sm:h-5 sm:w-5"
                aria-hidden
              />
            </span>
            <span
              className={`${brandTitleFont.className} text-xs font-extrabold uppercase tracking-wide text-[var(--brand-coral)] sm:text-sm md:text-[0.65rem]`}
            >
              {t("gameSession.exit")}
            </span>
          </button>
        </div>
      </aside>

      {confirmOpen && !exitLocked
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-[#080a24]/60 px-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="exit-match-title"
              onClick={() => setConfirmOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] p-5 text-[var(--brand-navy)] shadow-[6px_6px_0_rgba(20,23,77,0.85)]"
                onClick={(event) => event.stopPropagation()}
              >
                <h2
                  id="exit-match-title"
                  className={`${brandTitleFont.className} text-lg font-extrabold uppercase tracking-wide`}
                >
                  {t("gameSession.exitConfirmTitle")}
                </h2>
                <p
                  className={`${brandBodyFont.className} mt-2 text-sm leading-relaxed`}
                >
                  {t("gameSession.exitConfirmBody")}
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={`${brandBackButtonClassName} min-w-0 w-full sm:w-auto`}
                    onClick={() => setConfirmOpen(false)}
                  >
                    {t("gameSession.exitConfirmCancel")}
                  </button>
                  <button
                    type="button"
                    className={`${brandDangerButtonClassName} min-w-0 w-full sm:w-auto`}
                    onClick={handleConfirmExit}
                  >
                    {t("gameSession.exitConfirmAccept")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
