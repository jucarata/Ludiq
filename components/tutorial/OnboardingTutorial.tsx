"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaDice } from "react-icons/fa6";
import { GamePiece } from "@/components/board/GamePiece";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  ModeThumb,
  MODE_ACCENTS,
  type GameModeId,
} from "@/components/home/ModeVisual";
import { PiggyBank } from "@/components/multiplayer/PiggyBank";
import { useAppAuth } from "@/lib/auth/useAppAuth";
import {
  brandBodyFont,
  brandPlayButtonClassName,
  brandTitleFont,
} from "@/lib/fonts";
import { TUTORIAL_PRACTICE_HREF } from "@/lib/game/player-config";
import type { Profile } from "@/lib/profile/types";
import {
  readTutorialCompletedLocal,
  writeTutorialCompletedLocal,
} from "@/lib/tutorial/storage";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const STEPS = ["welcome", "modes", "party", "practice"] as const;
type StepId = (typeof STEPS)[number];

const PATH_COLORS = [
  "var(--brand-purple)",
  "var(--brand-coral)",
  "var(--brand-yellow)",
  "var(--brand-mint)",
  "var(--brand-turquoise)",
] as const;

const STEP_DOT_COLORS = [
  "var(--brand-purple)",
  "var(--brand-coral)",
  "var(--brand-yellow)",
  "var(--brand-mint)",
] as const;

const TUTORIAL_MODES: {
  id: GameModeId;
  titleKey: "home.friends" | "home.practice" | "home.versus";
  bodyKey:
    | "tutorial.modeFriends"
    | "tutorial.modePractice"
    | "tutorial.modeVersus";
  soon?: boolean;
}[] = [
  {
    id: "friends",
    titleKey: "home.friends",
    bodyKey: "tutorial.modeFriends",
  },
  {
    id: "practice",
    titleKey: "home.practice",
    bodyKey: "tutorial.modePractice",
  },
  {
    id: "versus",
    titleKey: "home.versus",
    bodyKey: "tutorial.modeVersus",
    soon: true,
  },
];

type OnboardingTutorialProps = {
  /** Force open (e.g. from Help → How to play) without rewriting completion. */
  forceOpen?: boolean;
  onForceClose?: () => void;
};

export function OnboardingTutorial({
  forceOpen = false,
  onForceClose,
}: OnboardingTutorialProps = {}) {
  const { t } = useTranslations();
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = useAppAuth();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [startingPlay, setStartingPlay] = useState(false);

  const persistCompleted = useCallback(async () => {
    writeTutorialCompletedLocal();

    if (!authenticated) return;

    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch("/api/profile/tutorial", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Local cache already set; DB sync can retry on a later visit.
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    const resolve = async () => {
      const localDone = readTutorialCompletedLocal();

      if (!authenticated) {
        if (!cancelled) {
          setOpen(!localDone);
          setResolved(true);
        }
        return;
      }

      try {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) {
            setOpen(!localDone);
            setResolved(true);
          }
          return;
        }

        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as { profile?: Profile | null };
        const profile = json.profile ?? null;

        if (cancelled) return;

        if (profile?.tutorial_completed) {
          writeTutorialCompletedLocal();
          setOpen(false);
        } else if (localDone) {
          await fetch("/api/profile/tutorial", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          setOpen(false);
        } else {
          setOpen(true);
        }
      } catch {
        if (!cancelled) setOpen(!localDone);
      } finally {
        if (!cancelled) setResolved(true);
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  const visible = forceOpen || (resolved && open);
  const step: StepId = STEPS[stepIndex] ?? "welcome";
  const isLast = stepIndex >= STEPS.length - 1;

  const close = async (markComplete: boolean) => {
    setOpen(false);
    setStepIndex(0);
    onForceClose?.();
    if (markComplete && !forceOpen) {
      await persistCompleted();
    }
  };

  const handleNext = async () => {
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    await close(true);
  };

  const handlePlay = async () => {
    if (startingPlay) return;
    setStartingPlay(true);
    setOpen(false);
    onForceClose?.();
    if (!forceOpen) {
      await persistCompleted();
    }
    router.push(TUTORIAL_PRACTICE_HREF);
  };

  if (!visible) return null;

  const title =
    step === "welcome"
      ? t("tutorial.welcomeTitle")
      : step === "modes"
        ? t("tutorial.modesTitle")
        : step === "party"
          ? t("tutorial.partyTitle")
          : t("tutorial.practiceTitle");

  const primaryLabel =
    step === "practice" ? t("tutorial.play") : isLast ? t("tutorial.finish") : t("tutorial.next");
  const onPrimary =
    step === "practice" ? () => void handlePlay() : () => void handleNext();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#080a24]/75 px-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="lobby-pop w-full max-w-sm overflow-hidden rounded-[1.5rem] border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] text-[var(--brand-navy)] shadow-[0_14px_0_rgba(20,23,77,0.85)]">
        <div className="flex h-2.5 w-full overflow-hidden" aria-hidden>
          {PATH_COLORS.map((color) => (
            <span
              key={color}
              className="relative h-full flex-1 border-r border-white/30 last:border-r-0"
              style={{ backgroundColor: color }}
            >
              <span className="absolute inset-x-0 top-0 h-1/2 bg-white/25" />
            </span>
          ))}
        </div>

        <div className="relative flex items-start justify-between gap-3 px-4 pb-1 pt-3">
          <p
            className={`${brandBodyFont.className} rounded-lg border-2 border-[var(--brand-navy)] bg-[var(--brand-yellow)] px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide shadow-[2px_2px_0_var(--brand-navy)]`}
          >
            {t("tutorial.step", {
              current: stepIndex + 1,
              total: STEPS.length,
            })}
          </p>
          <button
            type="button"
            onClick={() => void close(true)}
            className={`${brandBodyFont.className} shrink-0 rounded-xl border-2 border-[var(--brand-navy)] bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-[2px_2px_0_var(--brand-navy)] transition-[transform,box-shadow] duration-150 hover:brightness-95 active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--brand-navy)]`}
            aria-label={t("tutorial.skip")}
          >
            {t("tutorial.skip")}
          </button>
        </div>

        <div
          key={step}
          className="lobby-pop flex flex-col gap-4 px-5 pb-5 pt-1"
        >
          {step === "welcome" ? (
            <WelcomeStep
              title={title}
              body={t("tutorial.welcomeBody")}
              hint={t("tutorial.welcomeHint")}
            />
          ) : step === "modes" ? (
            <ModesStep title={title} soonLabel={t("nav.comingSoon")} />
          ) : step === "party" ? (
            <PartyStep
              title={title}
              body={t("tutorial.partyBody")}
              hint={t("tutorial.partyHint")}
            />
          ) : (
            <PracticeStep
              title={title}
              body={t("tutorial.practiceBody")}
              hint={t("tutorial.practiceHint")}
            />
          )}

          <div className="flex items-center justify-center gap-2" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={STEPS[i]}
                className={`h-2.5 rounded-full border-2 border-[var(--brand-navy)] transition-all duration-300 ${
                  i === stepIndex
                    ? "w-7 shadow-[2px_2px_0_var(--brand-navy)]"
                    : "w-2.5 opacity-50"
                }`}
                style={{
                  backgroundColor:
                    i === stepIndex
                      ? STEP_DOT_COLORS[i]
                      : "var(--brand-cream)",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onPrimary}
            disabled={startingPlay}
            className={`${brandPlayButtonClassName} w-full min-w-0`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({
  title,
  body,
  hint,
}: {
  title: string;
  body: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-[1.25rem] border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(160deg,var(--brand-purple)_0%,#4b2bb8_45%,var(--brand-turquoise)_140%)] px-4 pb-5 pt-6 shadow-[4px_4px_0_var(--brand-navy)]">
        <span
          className="pointer-events-none absolute -left-3 top-4 h-10 w-10 rotate-12 rounded-xl border-2 border-white/40 bg-[var(--brand-coral)] opacity-90"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-2 bottom-6 h-8 w-8 -rotate-12 rounded-lg border-2 border-white/40 bg-[var(--brand-yellow)] opacity-90"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-3 left-6 h-6 w-6 rounded-md border-2 border-white/40 bg-[var(--brand-mint)] opacity-90"
          aria-hidden
        />
        <FaDice
          className="pointer-events-none absolute right-5 top-5 h-7 w-7 rotate-[18deg] text-white/35"
          aria-hidden
        />

        <img
          src={`${basePath}/images/partyk-logo-color.png`}
          alt="Partyk"
          className="brand-logo-float relative z-10 h-auto w-[min(70%,11.5rem)] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          draggable={false}
        />
      </div>

      <h2
        className={`${brandTitleFont.className} text-2xl font-extrabold uppercase tracking-wide text-[var(--brand-navy)]`}
        style={{ textShadow: "0 2px 0 rgba(255,200,0,0.45)" }}
      >
        {title}
      </h2>

      <div className="w-full rounded-2xl border-[3px] border-[var(--brand-navy)] bg-white px-4 py-3.5 text-left shadow-[3px_3px_0_var(--brand-coral)]">
        <p className={`${brandBodyFont.className} text-base leading-relaxed`}>
          {body}
        </p>
        <p
          className={`${brandBodyFont.className} mt-2 rounded-xl bg-[var(--brand-yellow)]/35 px-3 py-2 text-sm font-semibold leading-relaxed`}
        >
          {hint}
        </p>
      </div>
    </div>
  );
}

function ModesStep({
  title,
  soonLabel,
}: {
  title: string;
  soonLabel: string;
}) {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(135deg,var(--brand-mint)_0%,var(--brand-turquoise)_100%)] px-4 py-3 shadow-[4px_4px_0_var(--brand-navy)]">
        <h2
          className={`${brandTitleFont.className} text-center text-xl font-extrabold uppercase tracking-wide text-white`}
          style={{ textShadow: "0 2px 0 rgba(20,23,77,0.45)" }}
        >
          {title}
        </h2>
      </div>

      <ul className="flex flex-col gap-2.5">
        {TUTORIAL_MODES.map((mode) => (
          <li
            key={mode.id}
            className="flex gap-3 rounded-2xl border-[3px] border-[var(--brand-navy)] bg-white px-2.5 py-2"
            style={{ boxShadow: `3px 3px 0 ${MODE_ACCENTS[mode.id]}` }}
          >
            <ModeThumb
              modeId={mode.id}
              comingSoon={mode.soon ? soonLabel : undefined}
            />
            <div className="min-w-0 flex-1 self-center pr-1">
              <p
                className={`${brandTitleFont.className} text-sm font-extrabold uppercase tracking-wide`}
              >
                {t(mode.titleKey)}
              </p>
              <p
                className={`${brandBodyFont.className} mt-0.5 text-sm leading-snug opacity-80`}
              >
                {t(mode.bodyKey)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PartyStep({
  title,
  body,
  hint,
}: {
  title: string;
  body: string;
  hint: string;
}) {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(135deg,var(--brand-coral)_0%,#ff7a93_55%,var(--brand-yellow)_140%)] px-4 py-3 shadow-[4px_4px_0_var(--brand-navy)]">
        <h2
          className={`${brandTitleFont.className} text-center text-xl font-extrabold uppercase tracking-wide text-[var(--brand-navy)]`}
          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
        >
          {title}
        </h2>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(165deg,#1a1e52_0%,#12153f_100%)] px-3 pb-3 pt-4 shadow-[4px_4px_0_var(--brand-navy)]"
        aria-hidden
      >
        <div className="mb-3 flex justify-center">
          <span
            className={`${brandTitleFont.className} lobby-badge-pulse rounded-full border-2 border-[var(--brand-navy)] bg-[var(--brand-coral)] px-2.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-white shadow-[2px_2px_0_var(--brand-navy)]`}
          >
            {t("room.partyActive")}
          </span>
        </div>

        <div className="lobby-shimmer relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(125deg,#ff4b6e22_0%,#1a1e52_38%,#00c2ff22_100%)] px-2.5 py-2.5 shadow-[3px_3px_0_var(--brand-navy)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brand-coral),var(--brand-yellow),var(--brand-mint),var(--brand-turquoise))]" />
          <PiggyBank className="piggy-bob h-11 w-auto shrink-0" coinCount={4} />
          <div className="min-w-0 flex-1">
            <p
              className={`${brandTitleFont.className} truncate text-lg font-extrabold tracking-wide text-[var(--brand-yellow)] drop-shadow-[0_1px_0_var(--brand-navy)]`}
            >
              {t("room.potAmount", { amount: "12.50" })}
            </p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--brand-cream)]/70">
              {t("room.potLabel")}
            </p>
          </div>
          <span
            className={`${brandTitleFont.className} flex h-10 shrink-0 items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-yellow)] px-2.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--brand-navy)] shadow-[2px_2px_0_var(--brand-navy)]`}
          >
            {t("room.contributeAction")}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border-[3px] border-[var(--brand-navy)] bg-white px-4 py-3 text-left shadow-[3px_3px_0_var(--brand-coral)]">
        <p className={`${brandBodyFont.className} text-sm leading-relaxed`}>
          {body}
        </p>
        <p
          className={`${brandBodyFont.className} mt-2 rounded-xl bg-[var(--brand-mint)]/25 px-3 py-2 text-sm font-semibold leading-relaxed`}
        >
          {hint}
        </p>
      </div>
    </div>
  );
}

function PracticeStep({
  title,
  body,
  hint,
}: {
  title: string;
  body: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(135deg,var(--brand-yellow)_0%,#ffd84a_50%,var(--brand-mint)_140%)] px-4 py-3 shadow-[4px_4px_0_var(--brand-navy)]">
        <h2
          className={`${brandTitleFont.className} text-center text-xl font-extrabold uppercase tracking-wide text-[var(--brand-navy)]`}
          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
        >
          {title}
        </h2>
      </div>

      <div
        className="relative flex items-center justify-center gap-4 overflow-hidden rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(165deg,#FFD84A_0%,#FFC800_42%,#D97706_100%)] px-4 py-5 shadow-[4px_4px_0_var(--brand-navy)]"
        aria-hidden
      >
        <ModeThumb modeId="practice" />
        <div className="flex items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] shadow-[3px_3px_0_var(--brand-navy)]">
            <GamePiece color="red" className="h-8 w-8" />
          </span>
          <span
            className={`${brandTitleFont.className} text-lg font-extrabold text-white`}
            style={{ textShadow: "0 2px 0 var(--brand-navy)" }}
          >
            VS
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] shadow-[3px_3px_0_var(--brand-navy)]">
            <GamePiece color="blue" className="h-8 w-8" />
          </span>
        </div>
      </div>

      <div className="rounded-2xl border-[3px] border-[var(--brand-navy)] bg-white px-4 py-3 text-left shadow-[3px_3px_0_var(--brand-yellow)]">
        <p className={`${brandBodyFont.className} text-sm leading-relaxed`}>
          {body}
        </p>
        <p
          className={`${brandBodyFont.className} mt-2 rounded-xl bg-[var(--brand-turquoise)]/20 px-3 py-2 text-sm font-semibold leading-relaxed`}
        >
          {hint}
        </p>
      </div>
    </div>
  );
}
