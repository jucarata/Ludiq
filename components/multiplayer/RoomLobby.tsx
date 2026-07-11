"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GamePiece } from "@/components/board/GamePiece";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import {
  PLAYER_COLORS,
  type PlayerColor,
} from "@/lib/board/types";
import {
  retroActionFont,
  retroBackButtonClassName,
  retroDangerButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";
import { getPlayerColorLabel } from "@/lib/i18n";
import { availableColors } from "@/lib/room/colors";
import type { RoomView } from "@/lib/room/types";

type RoomLobbyProps = {
  title: string;
  subtitle: string;
  room: RoomView;
  changingColor?: boolean;
  closing?: boolean;
  leaving?: boolean;
  starting?: boolean;
  error?: string | null;
  onSelectColor: (color: PlayerColor) => void;
  onLeave: () => void;
  onCloseRoom?: () => void;
  onStartGame?: () => void;
};

type BubbleAnchor = { x: number; y: number };

export function RoomLobby({
  title,
  subtitle,
  room,
  changingColor = false,
  closing = false,
  leaving = false,
  starting = false,
  error = null,
  onSelectColor,
  onLeave,
  onCloseRoom,
  onStartGame,
}: RoomLobbyProps) {
  const { t, locale } = useTranslations();
  const [picking, setPicking] = useState(false);
  const [anchor, setAnchor] = useState<BubbleAnchor | null>(null);
  const [mounted, setMounted] = useState(false);
  const [confirmHostLeave, setConfirmHostLeave] = useState(false);
  const pieceButtonRef = useRef<HTMLButtonElement | null>(null);

  const self = room.players.find((player) => player.isSelf) ?? null;
  const isHost = Boolean(self?.isHost);
  const canStartGame =
    isHost &&
    Boolean(onStartGame) &&
    room.status === "waiting" &&
    room.players.length >= 2 &&
    room.players.length <= 4;
  const busy = changingColor || closing || leaving || starting;
  const takenColors = room.players.map((player) => player.color);
  const freeColors = availableColors(
    takenColors.filter((color) => color !== self?.color),
  );
  const canChangeColor = Boolean(self) && freeColors.length > 0 && !busy;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPicking(false);
    setAnchor(null);
  }, [self?.color, room.players.length]);

  useEffect(() => {
    if (!picking) return;

    const updateAnchor = () => {
      const el = pieceButtonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchor({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    };

    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [picking]);

  useEffect(() => {
    if (!picking) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-color-pick-bubble]")) return;
      if (target.closest("[data-self-piece-button]")) return;
      setPicking(false);
      setAnchor(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [picking]);

  const handlePieceClick = () => {
    if (!canChangeColor) return;

    if (picking) {
      setPicking(false);
      setAnchor(null);
      return;
    }

    const el = pieceButtonRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setAnchor({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    setPicking(true);
  };

  const handlePickColor = (color: PlayerColor) => {
    if (busy || color === self?.color) return;
    setPicking(false);
    setAnchor(null);
    onSelectColor(color);
  };

  const handleBackClick = () => {
    if (busy) return;
    if (isHost) {
      setConfirmHostLeave(true);
      return;
    }
    onLeave();
  };

  const handleConfirmHostLeave = () => {
    setConfirmHostLeave(false);
    onLeave();
  };

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
        aria-labelledby="players-heading"
        className="flex w-full max-w-sm flex-col items-center gap-3"
      >
        <h2
          id="players-heading"
          className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--board-path-border)]"
        >
          {t("room.players")}
        </h2>

        <ul
          className="flex flex-wrap items-end justify-center gap-4 sm:gap-5"
          aria-label={t("room.players")}
        >
          {room.players.map((player) => {
            const { fill } = PLAYER_COLORS[player.color];
            const label = getPlayerColorLabel(locale, player.color);
            const isSelf = player.isSelf;

            return (
              <li
                key={player.id}
                className="flex w-[4.5rem] flex-col items-center gap-1.5 sm:w-20"
              >
                {isSelf ? (
                  <button
                    ref={pieceButtonRef}
                    type="button"
                    data-self-piece-button
                    disabled={!canChangeColor}
                    aria-pressed={picking}
                    aria-label={
                      canChangeColor
                        ? t("room.changeColorAria", { color: label })
                        : t("room.yourPieceAria", { color: label })
                    }
                    onClick={handlePieceClick}
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] transition-all sm:h-16 sm:w-16 ${
                      canChangeColor
                        ? "cursor-pointer border-[var(--board-path-border)] bg-[#2a2a3e] hover:brightness-110 active:scale-95"
                        : "cursor-default border-[var(--board-path-border)]/60 bg-[#2a2a3e]"
                    }`}
                    style={{ boxShadow: `0 0 14px ${fill}55` }}
                  >
                    <GamePiece
                      color={player.color}
                      className="h-10 w-10 sm:h-11 sm:w-11"
                    />
                  </button>
                ) : (
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-transparent bg-[#1a1a2e] sm:h-16 sm:w-16"
                    aria-label={t("room.playerPieceAria", {
                      user: player.username,
                      color: label,
                    })}
                  >
                    <GamePiece
                      color={player.color}
                      className="h-10 w-10 sm:h-11 sm:w-11"
                    />
                  </div>
                )}

                <span
                  className={`max-w-full truncate text-center text-[0.65rem] font-semibold sm:text-xs ${
                    isSelf
                      ? "text-[var(--board-green)]"
                      : "text-[var(--board-path-border)]"
                  }`}
                >
                  @{player.username}
                </span>
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

      {isHost && onStartGame ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-2">
          <button
            type="button"
            disabled={busy || !canStartGame}
            onClick={onStartGame}
            className={`${retroPlayButtonClassName} w-full min-w-0`}
            aria-label={t("room.play")}
          >
            {starting ? t("room.starting") : t("room.play")}
          </button>
          {!canStartGame && !starting ? (
            <p className="text-center text-[0.65rem] text-[var(--board-path-border)] sm:text-xs">
              {t("room.playHint")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={handleBackClick}
          className={retroBackButtonClassName}
        >
          {leaving ? t("room.leaving") : t("room.back")}
        </button>
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

      {confirmHostLeave
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="host-leave-title"
              onClick={() => setConfirmHostLeave(false)}
            >
              <div
                className="w-full max-w-sm rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] p-5 text-[#173532] shadow-[6px_6px_0_#173532]"
                onClick={(event) => event.stopPropagation()}
              >
                <h2
                  id="host-leave-title"
                  className={`${retroActionFont.className} mb-3 text-[0.65rem]`}
                >
                  {t("room.hostLeaveTitle")}
                </h2>
                <p className="mb-5 text-sm leading-relaxed">
                  {t("room.hostLeaveMessage")}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={retroBackButtonClassName}
                    onClick={() => setConfirmHostLeave(false)}
                  >
                    {t("room.hostLeaveCancel")}
                  </button>
                  <button
                    type="button"
                    className={retroDangerButtonClassName}
                    onClick={handleConfirmHostLeave}
                  >
                    {t("room.hostLeaveConfirm")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {mounted && picking && canChangeColor && anchor
        ? createPortal(
            <div
              data-color-pick-bubble
              className="pointer-events-auto fixed z-[70] -translate-x-1/2 -translate-y-full pb-2"
              style={{ left: anchor.x, top: anchor.y }}
              role="listbox"
              aria-label={t("room.availableColors")}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex gap-1 rounded-xl border-2 border-amber-400 bg-white p-1.5 shadow-lg">
                {freeColors.map((color) => {
                  const optionLabel = getPlayerColorLabel(locale, color);
                  return (
                    <button
                      key={color}
                      type="button"
                      role="option"
                      aria-label={optionLabel}
                      disabled={busy}
                      onClick={() => handlePickColor(color)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-zinc-200 bg-white transition hover:scale-105 hover:bg-amber-50 active:scale-95 sm:h-11 sm:w-11"
                    >
                      <GamePiece
                        color={color}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      />
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}
