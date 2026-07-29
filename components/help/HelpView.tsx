"use client";

import { useState } from "react";
import { FaCircleQuestion, FaEnvelope } from "react-icons/fa6";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { OnboardingTutorial } from "@/components/tutorial/OnboardingTutorial";
import {
  brandSecondaryButtonClassName,
  brandTitleFont,
  retroPlayButtonClassName,
} from "@/lib/fonts";

const SUPPORT_EMAIL = "contact.jucara+partyk@gmail.com";

export function HelpView() {
  const { t } = useTranslations();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
      {showTutorial ? (
        <OnboardingTutorial
          forceOpen
          onForceClose={() => setShowTutorial(false)}
        />
      ) : null}

      <div className="flex flex-col items-center gap-2 text-center">
        <h1
          className={`${brandTitleFont.className} text-4xl font-extrabold tracking-wide text-[var(--brand-cream)] sm:text-5xl`}
        >
          {t("help.title")}
        </h1>
        <p className="max-w-md text-sm text-[var(--board-path-border)]">
          {t("help.subtitle")}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className={`${retroPlayButtonClassName} w-full min-w-0 gap-2`}
          aria-label={t("help.support")}
        >
          <FaEnvelope className="h-5 w-5 shrink-0" aria-hidden />
          {t("help.support")}
        </a>
        <button
          type="button"
          onClick={() => setShowTutorial(true)}
          className={`${brandSecondaryButtonClassName} w-full min-w-0 gap-2`}
          aria-label={t("help.howToPlay")}
        >
          <FaCircleQuestion className="h-5 w-5 shrink-0" aria-hidden />
          {t("help.howToPlay")}
        </button>
      </div>
    </main>
  );
}
