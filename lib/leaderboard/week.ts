/** UTC week: Monday 00:00 → next Monday 00:00. */

export type UtcWeekRange = {
  start: Date;
  end: Date;
};

export function getUtcWeekRange(now: Date = new Date()): UtcWeekRange {
  const day = now.getUTCDay(); // 0 Sun … 6 Sat
  const daysFromMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday,
    ),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

export function formatWeekRangeLabel(
  start: Date,
  end: Date,
  locale: string,
): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const endInclusive = new Date(end);
  endInclusive.setUTCDate(endInclusive.getUTCDate() - 1);
  const startLabel = start.toLocaleDateString(locale, opts);
  const endLabel = endInclusive.toLocaleDateString(locale, opts);
  return `${startLabel} – ${endLabel}`;
}
