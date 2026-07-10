"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { retroPlayButtonClassName } from "@/lib/fonts";

export function MultiplayerHub() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [closedNotice, setClosedNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get("closed") !== "1") return;
    setClosedNotice(true);
    router.replace("/multiplayer", { scroll: false });
  }, [searchParams, router]);

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--board-path)] sm:text-5xl">
          {t("multiplayer.title")}
        </h1>
        <p className="max-w-md text-sm text-[var(--board-path-border)]">
          {t("multiplayer.subtitle")}
        </p>
        {closedNotice ? (
          <p className="max-w-md text-sm text-[var(--board-red)]">
            {t("multiplayer.roomClosed")}
          </p>
        ) : null}
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Link
          href="/multiplayer/create"
          className={`${retroPlayButtonClassName} w-full min-w-0`}
          aria-label={t("multiplayer.createRoom")}
        >
          {t("multiplayer.createRoom")}
        </Link>
        <Link
          href="/multiplayer/join"
          className={`${retroPlayButtonClassName} w-full min-w-0`}
          aria-label={t("multiplayer.joinRoom")}
        >
          {t("multiplayer.joinRoom")}
        </Link>
      </div>
    </main>
  );
}
