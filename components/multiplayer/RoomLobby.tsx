"use client";

import Link from "next/link";
import { GamePiece } from "@/components/board/GamePiece";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  PLAYER_COLORS,
  PLAYER_ORDER,
  type PlayerColor,
} from "@/lib/board/types";
import {
  retroActionFont,
  retroBackButtonClassName,
  retroDangerButtonClassName,
} from "@/lib/fonts";
import { getPlayerColorLabel } from "@/lib/i18n";
import type { RoomView } from "@/lib/room/types";

type RoomLobbyProps = {
  title: string;
  subtitle: string;
  room: RoomView;
  changingColor?: boolean;
  closing?: boolean;
  error?: string | null;
  onSelectColor: (color: PlayerColor) => void;
  onCloseRoom?: () => void;
};

export function RoomLobby({
  title,
  subtitle,
  room,
  changingColor = false,
  closing = false,
  error = null,
  onSelectColor,
  onCloseRoom,
}: RoomLobbyProps) {
  const { t, locale } = useTranslations();

  const occupantsByColor = room.players.reduce(
    (acc, player) => {
      acc[player.color] = {
        username: player.username,
        isSelf: player.isSelf,
      };
      return acc;
    },
    {} as Partial<
      Record<PlayerColor, { username: string; isSelf: boolean }>
    >,
  );

  const myColor = room.players.find((player) => player.isSelf)?.color ?? null;
  const isHost = room.players.some((player) => player.isSelf && player.isHost);
  const busy = changingColor || closing;

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-5 sm:gap-5 sm:py-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-3xl font-black tracking-tight text-[var(--board-path)] sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-md text-xs text-[var(--board-path-border)] sm:text-sm">
          {subtitle}
        </p>
      </div>

      <section
        aria-labelledby="room-code-heading"
        className="flex w-full max-w-sm flex-col items-center gap-1.5"
      >
        <h2
          id="room-code-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--board-path-border)]"
        >
          {t("room.codeLabel")}
        </h2>
        <p
          className={`${retroActionFont.className} select-all rounded-xl border-[3px] border-[var(--board-path-border)] bg-[#2a2a3e] px-6 py-3 text-2xl tracking-[0.35em] text-[var(--board-path)] sm:text-3xl`}
          aria-label={t("room.codeAria", { code: room.code })}
        >
          {room.code}
        </p>
        <p className="text-center text-[0.65rem] text-[var(--board-path-border)] sm:text-xs">
          {t("room.codeHint")}
        </p>
      </section>

      <section
        aria-labelledby="piece-color-heading"
        className="flex w-full max-w-sm flex-col gap-1.5"
      >
        <h2
          id="piece-color-heading"
          className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--board-path-border)]"
        >
          {t("room.pickColor")}
        </h2>

        <ul
          className="flex flex-col gap-1.5"
          role="radiogroup"
          aria-label={t("room.pickColor")}
        >
          {PLAYER_ORDER.map((color) => {
            const { fill } = PLAYER_COLORS[color];
            const label = getPlayerColorLabel(locale, color);
            const occupant = occupantsByColor[color];
            const isSelected = myColor === color;
            const isTakenByOther = Boolean(occupant && !occupant.isSelf);
            const disabled = busy || isTakenByOther;

            return (
              <li key={color}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={disabled}
                  onClick={() => onSelectColor(color)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border-[3px] px-3 py-1.5 transition-all sm:px-3.5 sm:py-2 ${
                    isSelected
                      ? "border-[var(--board-path-border)] bg-[#2a2a3e]"
                      : isTakenByOther
                        ? "cursor-not-allowed border-transparent bg-[#1a1a2e] opacity-35"
                        : "cursor-pointer border-transparent bg-[#1a1a2e] opacity-40 hover:opacity-70"
                  }`}
                  style={
                    isSelected
                      ? { boxShadow: `0 0 12px ${fill}44` }
                      : undefined
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center sm:h-8 sm:w-8">
                      <GamePiece color={color} className="h-full w-full" />
                    </span>
                    <span className="truncate text-sm font-semibold text-[var(--board-path)] sm:text-base">
                      {label}
                    </span>
                  </span>

                  {occupant ? (
                    <span
                      className={`shrink-0 truncate text-right text-xs font-semibold sm:text-sm ${
                        occupant.isSelf
                          ? "text-[var(--board-green)]"
                          : "text-[var(--board-path-border)]"
                      }`}
                    >
                      @{occupant.username}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {error ? (
        <p className="max-w-sm text-center text-xs text-[var(--board-red)] sm:text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/multiplayer" className={retroBackButtonClassName}>
          {t("room.back")}
        </Link>
        {isHost && onCloseRoom ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCloseRoom}
            className={retroDangerButtonClassName}
          >
            {closing ? t("room.closing") : t("room.closeRoom")}
          </button>
        ) : null}
      </div>
    </main>
  );
}
