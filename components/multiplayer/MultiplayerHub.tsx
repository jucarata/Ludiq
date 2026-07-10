"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  retroBackButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";

export function MultiplayerHub() {
  const { t } = useTranslations();

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
          {t("multiplayer.title")}
        </h1>
        <p className="max-w-md text-sm text-[var(--board-path-border)]">
          {t("multiplayer.subtitle")}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Link
          href="/multiplayer/create"
          className={retroPlayButtonClassName}
          aria-label={t("multiplayer.createRoom")}
        >
          {t("multiplayer.createRoom")}
        </Link>
        <Link
          href="/multiplayer/join"
          className={retroPlayButtonClassName}
          aria-label={t("multiplayer.joinRoom")}
        >
          {t("multiplayer.joinRoom")}
        </Link>
      </div>

      <Link href="/" className={retroBackButtonClassName}>
        {t("multiplayer.back")}
      </Link>
    </main>
  );
}
