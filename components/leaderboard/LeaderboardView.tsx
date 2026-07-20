"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { FaMedal, FaTrophy } from "react-icons/fa6";
import { useLocale, useTranslations } from "@/components/i18n/LocaleProvider";
import type {
  LeaderboardEntry,
  LeaderboardMe,
  WeeklyLeaderboard,
} from "@/lib/leaderboard/service";
import { formatWeekRangeLabel } from "@/lib/leaderboard/week";
import {
  retroActionFont,
  retroPlayButtonClassName,
} from "@/lib/fonts";

/** Visual podium columns: 2nd · 1st · 3rd */
const PODIUM_SLOTS = [2, 1, 3] as const;

function formatUsdc(amount: number): string {
  if (amount <= 0) return "0.00";
  if (amount < 0.01) return amount.toFixed(4);
  return amount.toFixed(2);
}

const podiumStyles: Record<
  1 | 2 | 3,
  { accent: string; height: string; medal: string }
> = {
  1: {
    accent: "var(--board-victory-gold)",
    height: "h-28 sm:h-32",
    medal: "text-[var(--board-victory-gold)]",
  },
  2: {
    accent: "#b8c4ce",
    height: "h-20 sm:h-24",
    medal: "text-[#b8c4ce]",
  },
  3: {
    accent: "var(--board-victory)",
    height: "h-16 sm:h-20",
    medal: "text-[var(--board-victory-light)]",
  },
};

function PodiumSlot({
  entry,
  place,
  prizeUsdc,
}: {
  entry: LeaderboardEntry | undefined;
  place: 1 | 2 | 3;
  prizeUsdc: number;
}) {
  const { t } = useTranslations();
  const style = podiumStyles[place];

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-end gap-2 ${
        place === 1 ? "z-[1]" : ""
      }`}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <FaMedal className={`h-6 w-6 sm:h-7 sm:w-7 ${style.medal}`} aria-hidden />
        {entry ? (
          <>
            <p
              className={`${retroActionFont.className} max-w-[6.5rem] truncate text-[0.55rem] leading-tight text-[var(--board-path)] sm:max-w-[7.5rem] sm:text-[0.62rem]`}
              title={`@${entry.username}`}
            >
              @{entry.username}
            </p>
            <p className="text-xs font-bold text-[var(--board-victory-gold)] sm:text-sm">
              {t("leaderboard.trophyCount", { count: entry.trophies })}
            </p>
          </>
        ) : (
          <p className="text-xs text-[var(--board-path-border)]">
            {t("leaderboard.emptySlot")}
          </p>
        )}
        <p className="text-[0.65rem] font-semibold text-[#f5c518] sm:text-xs">
          {t("leaderboard.prizePayout", { amount: formatUsdc(prizeUsdc) })}
        </p>
      </div>
      <div
        className={`flex w-full max-w-[6.5rem] items-start justify-center rounded-t-xl border-[3px] border-b-0 border-[#173532] sm:max-w-[7.5rem] ${style.height}`}
        style={{ backgroundColor: style.accent }}
      >
        <span
          className={`${retroActionFont.className} pt-3 text-lg text-[#173532] sm:text-xl`}
        >
          {place}
        </span>
      </div>
    </div>
  );
}

function YourRankCard({
  me,
  authenticated,
}: {
  me: LeaderboardMe | null;
  authenticated: boolean;
}) {
  const { t } = useTranslations();

  if (!authenticated || !me) {
    return (
      <section
        aria-label={t("leaderboard.yourRank")}
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-[3px] border-[#173532] bg-[var(--board-path)] px-5 py-5 text-center shadow-[4px_4px_0_#173532]"
      >
        <p
          className={`${retroActionFont.className} text-[0.55rem] uppercase tracking-wide text-[#173532] sm:text-[0.62rem]`}
        >
          {t("leaderboard.yourRank")}
        </p>
        <p className="text-sm text-[#173532]">{t("leaderboard.guestBlurb")}</p>
        <Link
          href="/profile"
          className={`${retroPlayButtonClassName} w-full min-w-0`}
        >
          {t("leaderboard.connectCta")}
        </Link>
      </section>
    );
  }

  if (!me.registered) {
    return (
      <section
        aria-label={t("leaderboard.yourRank")}
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-[3px] border-[#173532] bg-[var(--board-path)] px-5 py-5 text-center shadow-[4px_4px_0_#173532]"
      >
        <p
          className={`${retroActionFont.className} text-[0.55rem] uppercase tracking-wide text-[#173532] sm:text-[0.62rem]`}
        >
          {t("leaderboard.yourRank")}
        </p>
        <p className="text-sm text-[#173532]">
          {t("leaderboard.finishProfileBlurb")}
        </p>
        <Link
          href="/profile"
          className={`${retroPlayButtonClassName} w-full min-w-0`}
        >
          {t("leaderboard.finishProfileCta")}
        </Link>
      </section>
    );
  }

  const ranked = me.rank != null;

  return (
    <section
      aria-label={t("leaderboard.yourRank")}
      className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border-[3px] border-[#173532] bg-[var(--board-path)] px-5 py-5 text-center shadow-[4px_4px_0_#173532]"
    >
      <p
        className={`${retroActionFont.className} text-[0.55rem] uppercase tracking-wide text-[#173532] sm:text-[0.62rem]`}
      >
        {t("leaderboard.yourRank")}
      </p>
      <p className="text-sm font-semibold text-[#173532]">@{me.username}</p>
      {ranked ? (
        <>
          <p
            className={`${retroActionFont.className} text-2xl text-[var(--board-green-dark)] sm:text-3xl`}
          >
            #{me.rank}
          </p>
          <p className="text-sm font-bold text-[var(--board-victory-gold-dark)]">
            {t("leaderboard.trophyCount", { count: me.trophies })}
          </p>
          {typeof me.prizeUsdc === "number" && me.prizeUsdc > 0 ? (
            <p className="text-sm font-semibold text-[var(--board-green-dark)]">
              {t("leaderboard.yourPrize", {
                amount: formatUsdc(me.prizeUsdc),
              })}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-[#173532]">
            {t("leaderboard.notRankedYet")}
          </p>
          <Link
            href="/multiplayer?mode=competitive"
            className={`${retroPlayButtonClassName} mt-1 w-full min-w-0`}
          >
            {t("leaderboard.playCompetitiveCta")}
          </Link>
        </>
      )}
    </section>
  );
}

export function LeaderboardView() {
  const { t } = useTranslations();
  const { locale } = useLocale();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [data, setData] = useState<WeeklyLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const headers: Record<string, string> = {};
      if (authenticated) {
        const token = await getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch("/api/leaderboard", { headers });
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as WeeklyLeaderboard;
      setData(json);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const entryForPlace = (place: 1 | 2 | 3) =>
    data?.top.find((entry) => entry.rank === place);

  const prizeForPlace = (place: 1 | 2 | 3) =>
    data?.prizesByPlace[String(place) as "1" | "2" | "3"] ?? 0;

  const weekLabel =
    data != null
      ? formatWeekRangeLabel(
          new Date(data.weekStart),
          new Date(data.weekEnd),
          locale === "es" ? "es" : "en",
        )
      : null;

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 py-8">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-[var(--board-victory-gold)]">
            <FaTrophy className="h-7 w-7" aria-hidden />
            <h1 className="text-3xl font-black tracking-tight text-[var(--board-path)] sm:text-4xl">
              {t("leaderboard.title")}
            </h1>
          </div>
          <p className="max-w-sm text-sm text-[var(--board-path-border)]">
            {t("leaderboard.subtitle")}
          </p>
          {weekLabel ? (
            <p
              className={`${retroActionFont.className} text-[0.5rem] uppercase tracking-wide text-[var(--board-path)]/70 sm:text-[0.55rem]`}
            >
              {t("leaderboard.thisWeek", { range: weekLabel })}
            </p>
          ) : null}
          {data && data.prizePoolUsdc > 0 ? (
            <p className="text-xs font-semibold text-[#f5c518]">
              {t("leaderboard.prizePool", {
                amount: formatUsdc(data.prizePoolUsdc),
              })}
            </p>
          ) : null}
        </header>

        {loading ? (
          <p className="text-sm text-[var(--board-path-border)]">
            {t("leaderboard.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-[var(--board-red)]">
            {t("leaderboard.error")}
          </p>
        ) : (
          <>
            <section
              aria-label={t("leaderboard.topThree")}
              className="flex w-full items-end justify-center gap-2 px-1 sm:gap-3"
            >
              {PODIUM_SLOTS.map((place) => (
                <PodiumSlot
                  key={place}
                  place={place}
                  entry={entryForPlace(place)}
                  prizeUsdc={prizeForPlace(place)}
                />
              ))}
            </section>

            {data && data.top.length === 0 ? (
              <p className="text-center text-sm text-[var(--board-path-border)]">
                {t("leaderboard.emptyWeek")}
              </p>
            ) : null}

            <YourRankCard
              me={data?.me ?? null}
              authenticated={authenticated}
            />
          </>
        )}
      </div>
    </main>
  );
}
