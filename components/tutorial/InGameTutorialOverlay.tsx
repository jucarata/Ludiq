"use client";

import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  useInGameTutorial,
  type InGameTutorialStep,
} from "@/components/tutorial/InGameTutorialContext";
import type { MessageKey } from "@/lib/i18n";
import {
  brandBodyFont,
  brandTitleFont,
} from "@/lib/fonts";

type StepCopy = {
  title: MessageKey;
  body: MessageKey;
  showContinue: boolean;
  continueKey?: MessageKey;
  finale?: boolean;
  hidden?: boolean;
};

const STEP_COPY: Partial<
  Record<Exclude<InGameTutorialStep, "done">, StepCopy>
> = {
  intro: {
    title: "gameTutorial.introTitle",
    body: "gameTutorial.introBody",
    showContinue: true,
  },
  click_dice: {
    title: "gameTutorial.clickDiceTitle",
    body: "gameTutorial.clickDiceBody",
    showContinue: false,
  },
  throw_board: {
    title: "gameTutorial.throwTitle",
    body: "gameTutorial.throwBody",
    showContinue: false,
  },
  need_doubles: {
    title: "gameTutorial.needDoublesTitle",
    body: "gameTutorial.needDoublesBody",
    showContinue: true,
  },
  click_dice_again: {
    title: "gameTutorial.clickDiceAgainTitle",
    body: "gameTutorial.clickDiceAgainBody",
    showContinue: false,
  },
  throw_doubles: {
    title: "gameTutorial.throwDoublesTitle",
    body: "gameTutorial.throwDoublesBody",
    showContinue: false,
  },
  explain_move: {
    title: "gameTutorial.explainMoveTitle",
    body: "gameTutorial.explainMoveBody",
    showContinue: true,
  },
  do_move: {
    title: "gameTutorial.doMoveTitle",
    body: "gameTutorial.doMoveBody",
    showContinue: false,
  },
  do_move_again: {
    title: "gameTutorial.doMoveAgainTitle",
    body: "gameTutorial.doMoveAgainBody",
    showContinue: false,
  },
  await_rival_exit: {
    title: "gameTutorial.awaitRivalTitle",
    body: "gameTutorial.awaitRivalBody",
    showContinue: false,
    hidden: true,
  },
  rival_exited: {
    title: "gameTutorial.rivalExitedTitle",
    body: "gameTutorial.rivalExitedBody",
    showContinue: true,
  },
  bot_moving: {
    title: "gameTutorial.botMovingTitle",
    body: "gameTutorial.botMovingBody",
    showContinue: false,
  },
  rival_moved: {
    title: "gameTutorial.rivalMovedTitle",
    body: "gameTutorial.rivalMovedBody",
    showContinue: true,
  },
  safe_click_dice: {
    title: "gameTutorial.safeClickDiceTitle",
    body: "gameTutorial.safeClickDiceBody",
    showContinue: false,
  },
  safe_throw: {
    title: "gameTutorial.safeThrowTitle",
    body: "gameTutorial.safeThrowBody",
    showContinue: false,
  },
  safe_move: {
    title: "gameTutorial.safeMoveTitle",
    body: "gameTutorial.safeMoveBody",
    showContinue: false,
  },
  safe_landed: {
    title: "gameTutorial.safeLandedTitle",
    body: "gameTutorial.safeLandedBody",
    showContinue: true,
  },
  await_bot_second: {
    title: "gameTutorial.botMoving2Title",
    body: "gameTutorial.botMoving2Body",
    showContinue: false,
    hidden: true,
  },
  bot_moving_2: {
    title: "gameTutorial.botMoving2Title",
    body: "gameTutorial.botMoving2Body",
    showContinue: false,
  },
  capture_intro: {
    title: "gameTutorial.captureIntroTitle",
    body: "gameTutorial.captureIntroBody",
    showContinue: true,
  },
  capture_click_dice: {
    title: "gameTutorial.captureClickDiceTitle",
    body: "gameTutorial.captureClickDiceBody",
    showContinue: false,
  },
  capture_throw: {
    title: "gameTutorial.captureThrowTitle",
    body: "gameTutorial.captureThrowBody",
    showContinue: false,
  },
  capture_with_2: {
    title: "gameTutorial.captureWith2Title",
    body: "gameTutorial.captureWith2Body",
    showContinue: false,
  },
  capture_remaining_3: {
    title: "gameTutorial.captureRemaining3Title",
    body: "gameTutorial.captureRemaining3Body",
    showContinue: false,
  },
  finale: {
    title: "gameTutorial.finaleTitle",
    body: "gameTutorial.finaleBody",
    showContinue: true,
    continueKey: "gameTutorial.finaleCta",
    finale: true,
  },
};

export function InGameTutorialOverlay() {
  const { t } = useTranslations();
  const { step, allowedAction, advanceFromContinue, active } =
    useInGameTutorial();

  if (!active || step === "done") return null;

  const copy = STEP_COPY[step];
  if (!copy || copy.hidden) return null;

  const blockBoard = allowedAction === "continue";

  return (
    <div className="pointer-events-none absolute inset-0 z-[55]">
      {blockBoard ? (
        <div
          className="pointer-events-auto absolute inset-0 bg-[#080a24]/55"
          aria-hidden
        />
      ) : null}

      <div
        className={
          blockBoard
            ? "absolute inset-x-3 top-[12%] flex justify-center sm:inset-0 sm:items-center sm:px-3"
            : /* Soft tips over yellow quadrant — compact on mobile so the board stays readable */
              "absolute bottom-[10%] left-1.5 w-[min(42%,11.25rem)] sm:bottom-[22%] sm:left-3 sm:w-[min(100%-1.5rem,20rem)]"
        }
      >
        <div
          className={`pointer-events-auto w-full overflow-hidden rounded-xl border-2 border-[var(--brand-navy)] text-[var(--brand-navy)] shadow-[0_6px_0_rgba(20,23,77,0.85)] sm:rounded-2xl sm:border-[3px] sm:shadow-[0_10px_0_rgba(20,23,77,0.85)] ${
            copy.finale
              ? "bg-[linear-gradient(165deg,var(--brand-yellow)_0%,#fff8f0_45%,var(--brand-cream)_100%)]"
              : "bg-[var(--brand-cream)]"
          } ${blockBoard ? "max-w-[16.5rem] sm:max-w-sm" : ""}`}
          role="dialog"
          aria-label={t(copy.title)}
          aria-live="polite"
        >
          {copy.finale ? (
            <div
              className="h-1.5 w-full bg-[linear-gradient(90deg,var(--brand-coral),var(--brand-yellow),var(--brand-mint),var(--brand-turquoise),var(--brand-purple))] sm:h-2"
              aria-hidden
            />
          ) : null}
          <div className="px-2.5 py-2 sm:px-4 sm:py-3.5">
            <p
              className={`${brandBodyFont.className} text-[0.55rem] font-extrabold uppercase tracking-wide sm:text-[0.65rem] ${
                copy.finale
                  ? "text-[var(--brand-coral)]"
                  : "text-[var(--brand-purple)]"
              }`}
            >
              {t("gameTutorial.badge")}
            </p>
            <h2
              className={`${brandTitleFont.className} mt-0.5 font-extrabold uppercase leading-tight tracking-wide ${
                copy.finale
                  ? "text-base sm:text-2xl"
                  : "text-sm sm:text-lg"
              }`}
              style={
                copy.finale
                  ? { textShadow: "0 2px 0 rgba(255,200,0,0.55)" }
                  : undefined
              }
            >
              {t(copy.title)}
            </h2>
            <p
              className={`${brandBodyFont.className} mt-1 text-[0.7rem] leading-snug sm:mt-1.5 sm:text-sm sm:leading-relaxed ${
                copy.finale ? "font-semibold" : ""
              }`}
            >
              {t(copy.body)}
            </p>
            {copy.showContinue ? (
              <button
                type="button"
                onClick={advanceFromContinue}
                className={`${brandTitleFont.className} mt-2 flex h-9 w-full min-w-0 items-center justify-center rounded-lg border-2 border-[var(--brand-navy)] bg-[var(--brand-mint)] px-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_var(--brand-navy)] transition-[transform,box-shadow,filter] duration-150 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--brand-navy)] sm:mt-3 sm:h-14 sm:rounded-xl sm:border-[3px] sm:px-10 sm:text-lg sm:shadow-[4px_4px_0_var(--brand-navy)]`}
              >
                {t(copy.continueKey ?? "gameTutorial.continue")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
