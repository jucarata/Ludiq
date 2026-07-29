"use client";

import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  useInGameTutorial,
  type InGameTutorialStep,
} from "@/components/tutorial/InGameTutorialContext";
import type { MessageKey } from "@/lib/i18n";
import {
  brandBodyFont,
  brandPlayButtonClassName,
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
  bot_second: {
    title: "gameTutorial.botMovingTitle",
    body: "gameTutorial.botMovingBody",
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
  const softAtBottom = !blockBoard;

  return (
    <div className="pointer-events-none absolute inset-0 z-[55]">
      {blockBoard ? (
        <div
          className="pointer-events-auto absolute inset-0 bg-[#080a24]/55"
          aria-hidden
        />
      ) : null}

      <div
        className={`absolute inset-x-0 flex justify-center px-3 ${
          blockBoard
            ? "inset-y-0 items-center"
            : softAtBottom
              ? "bottom-3 items-end"
              : "top-3 items-start"
        }`}
      >
        <div
          className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border-[3px] border-[var(--brand-navy)] text-[var(--brand-navy)] shadow-[0_10px_0_rgba(20,23,77,0.85)] ${
            copy.finale
              ? "bg-[linear-gradient(165deg,var(--brand-yellow)_0%,#fff8f0_45%,var(--brand-cream)_100%)]"
              : "bg-[var(--brand-cream)]"
          }`}
          role="dialog"
          aria-label={t(copy.title)}
          aria-live="polite"
        >
          {copy.finale ? (
            <div
              className="h-2 w-full bg-[linear-gradient(90deg,var(--brand-coral),var(--brand-yellow),var(--brand-mint),var(--brand-turquoise),var(--brand-purple))]"
              aria-hidden
            />
          ) : null}
          <div className="px-4 py-3.5">
            <p
              className={`${brandBodyFont.className} text-[0.65rem] font-extrabold uppercase tracking-wide ${
                copy.finale
                  ? "text-[var(--brand-coral)]"
                  : "text-[var(--brand-purple)]"
              }`}
            >
              {t("gameTutorial.badge")}
            </p>
            <h2
              className={`${brandTitleFont.className} mt-0.5 font-extrabold uppercase tracking-wide ${
                copy.finale ? "text-2xl" : "text-lg"
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
              className={`${brandBodyFont.className} mt-1.5 text-sm leading-relaxed ${
                copy.finale ? "font-semibold" : ""
              }`}
            >
              {t(copy.body)}
            </p>
            {copy.showContinue ? (
              <button
                type="button"
                onClick={advanceFromContinue}
                className={`${brandPlayButtonClassName} mt-3 w-full min-w-0`}
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
