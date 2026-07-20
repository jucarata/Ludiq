"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GamePiece } from "@/components/board/GamePiece";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { DiceWaitScreen } from "@/components/multiplayer/DiceWaitScreen";
import { PiggyBank } from "@/components/multiplayer/PiggyBank";
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
  room: RoomView;
  changingColor?: boolean;
  closing?: boolean;
  leaving?: boolean;
  kicking?: boolean;
  starting?: boolean;
  confirmingEntry?: boolean;
  error?: string | null;
  onSelectColor: (color: PlayerColor) => void;
  onLeave: () => void;
  onCloseRoom?: () => void;
  onKickPlayer?: (playerId: string) => void;
  onStartGame?: () => void;
  onConfirmEntry?: () => void;
};

type BubbleAnchor = { x: number; y: number };

export function RoomLobby({
  room,
  changingColor = false,
  closing = false,
  leaving = false,
  kicking = false,
  starting = false,
  confirmingEntry = false,
  error = null,
  onSelectColor,
  onLeave,
  onCloseRoom,
  onKickPlayer,
  onStartGame,
  onConfirmEntry,
}: RoomLobbyProps) {
  const { t, locale } = useTranslations();
  const [picking, setPicking] = useState(false);
  const [anchor, setAnchor] = useState<BubbleAnchor | null>(null);
  const [mounted, setMounted] = useState(false);
  const [confirmHostLeave, setConfirmHostLeave] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);
  const pieceButtonRef = useRef<HTMLButtonElement | null>(null);

  const self = room.players.find((player) => player.isSelf) ?? null;
  const isHost = Boolean(self?.isHost);
  const isCompetitive = room.mode === "competitive";
  const allEntriesPaid =
    !isCompetitive || room.players.every((player) => player.entryPaid);
  const canStartGame =
    isHost &&
    Boolean(onStartGame) &&
    room.status === "waiting" &&
    room.players.length >= 2 &&
    room.players.length <= 4 &&
    allEntriesPaid;
  const needsEntryConfirm =
    isCompetitive &&
    Boolean(self) &&
    !self?.isHost &&
    !self?.entryPaid &&
    Boolean(onConfirmEntry);
  const busy =
    changingColor ||
    closing ||
    leaving ||
    kicking ||
    starting ||
    confirmingEntry;
  const takenColors = room.players.map((player) => player.color);
  const freeColors = availableColors(
    takenColors.filter((color) => color !== self?.color),
  );
  const canChangeColor = Boolean(self) && freeColors.length > 0 && !busy;
  const kickTarget =
    confirmKickId != null
      ? (room.players.find((player) => player.id === confirmKickId) ?? null)
      : null;
  const canKickPlayers =
    isHost &&
    Boolean(onKickPlayer) &&
    room.status === "waiting";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPicking(false);
    setAnchor(null);
  }, [self?.color, room.players.length]);

  useEffect(() => {
    if (
      confirmKickId != null &&
      !room.players.some((player) => player.id === confirmKickId)
    ) {
      setConfirmKickId(null);
    }
  }, [confirmKickId, room.players]);

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

  const handleConfirmKick = () => {
    if (!confirmKickId || !onKickPlayer) return;
    const playerId = confirmKickId;
    setConfirmKickId(null);
    onKickPlayer(playerId);
  };

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-5 sm:gap-5 sm:py-6">
      {starting ? (
        <DiceWaitScreen title={t("room.waitStarting")} overlay />
      ) : null}
      {confirmingEntry ? (
        <DiceWaitScreen
          title={t("room.waitShuffle")}
          hint={t("room.waitWalletHint")}
          overlay
        />
      ) : null}
      {!starting && closing ? (
        <DiceWaitScreen title={t("room.closing")} overlay />
      ) : null}
      {!starting && !closing && leaving ? (
        <DiceWaitScreen title={t("room.leaving")} overlay />
      ) : null}
      {isCompetitive ? (
        <section
          aria-label={t("room.potLabel")}
          className="flex w-full max-w-sm flex-col items-center"
        >
          <div className="relative flex flex-col items-center">
            <PiggyBank
              className="piggy-bob h-28 w-auto sm:h-32"
              coinCount={
                room.potAmountUsdt > 0
                  ? Math.min(6, Math.max(1, Math.round(room.potAmountUsdt * 10)))
                  : 0
              }
            />
            <p
              className={`${retroActionFont.className} -mt-1 text-[0.7rem] tracking-wide text-[#f5c518] sm:text-xs`}
            >
              {room.potAmountUsdt > 0
                ? t("room.potAmount", {
                    amount: room.potAmountUsdt.toFixed(2),
                  })
                : t("room.potAmountPending")}
            </p>
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="room-code-heading"
        className="flex w-full max-w-sm flex-col items-center gap-1.5"
      >
        <h1
          id="room-code-heading"
          className="text-3xl font-black tracking-tight text-[var(--board-path)] sm:text-4xl"
        >
          {t("room.roomHeading")}
        </h1>
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
          className="flex flex-wrap items-start justify-center gap-4 sm:gap-5"
          aria-label={t("room.players")}
        >
          {room.players.map((player) => {
            const { fill } = PLAYER_COLORS[player.color];
            const label = getPlayerColorLabel(locale, player.color);
            const isSelf = player.isSelf;
            const entryConfirmed = !isCompetitive || player.entryPaid;
            const showKick =
              canKickPlayers &&
              !isSelf &&
              !player.isHost &&
              (!isCompetitive || !player.entryPaid);
            const paymentBorderClass = isCompetitive
              ? entryConfirmed
                ? "border-[var(--board-green)]"
                : "border-[var(--board-red)]"
              : "border-[var(--board-path-border)]";
            const paymentBorderMutedClass = isCompetitive
              ? entryConfirmed
                ? "border-[var(--board-green)]"
                : "border-[var(--board-red)]"
              : "border-[var(--board-path-border)]/40";
            const pieceFrameClassName =
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] sm:h-16 sm:w-16";

            return (
              <li
                key={player.id}
                className="flex w-[4.5rem] flex-col items-center gap-1.5 sm:w-20"
              >
                <div className="relative">
                  {showKick ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmKickId(player.id)}
                      className="absolute right-0 top-0 z-10 flex h-4 w-4 translate-x-[5px] -translate-y-[5px] items-center justify-center rounded-sm border border-[#173532] bg-[var(--board-red)] text-[0.55rem] font-black leading-none text-[var(--board-path)] shadow-[1px_1px_0_#173532] transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
                      aria-label={t("room.kickAria", { user: player.username })}
                    >
                      ×
                    </button>
                  ) : null}
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
                      className={`${pieceFrameClassName} ${paymentBorderClass} transition-all ${
                        canChangeColor
                          ? "cursor-pointer bg-[#2a2a3e] hover:brightness-110 active:scale-95"
                          : "cursor-default bg-[#2a2a3e]"
                      }`}
                      style={{
                        boxShadow: isCompetitive
                          ? entryConfirmed
                            ? "0 0 12px color-mix(in srgb, var(--board-green) 55%, transparent)"
                            : "0 0 12px color-mix(in srgb, var(--board-red) 55%, transparent)"
                          : `0 0 14px ${fill}55`,
                      }}
                    >
                      <GamePiece
                        color={player.color}
                        className="h-10 w-10 sm:h-11 sm:w-11"
                      />
                    </button>
                  ) : (
                    <div
                      className={`${pieceFrameClassName} ${paymentBorderMutedClass} bg-[#2a2a3e]`}
                      style={
                        isCompetitive
                          ? {
                              boxShadow: entryConfirmed
                                ? "0 0 12px color-mix(in srgb, var(--board-green) 45%, transparent)"
                                : "0 0 12px color-mix(in srgb, var(--board-red) 45%, transparent)",
                            }
                          : undefined
                      }
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
                </div>

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

      {needsEntryConfirm || (isHost && onStartGame) ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          {needsEntryConfirm ? (
            <button
              type="button"
              disabled={busy}
              onClick={onConfirmEntry}
              className={`${retroPlayButtonClassName} h-auto min-h-14 w-full min-w-0 flex-col gap-0.5 py-2 leading-tight sm:min-h-[3.75rem]`}
              aria-label={t("room.confirmEntry")}
            >
              <span>{t("room.confirmEntry")}</span>
              <span className="text-[0.65rem] normal-case tracking-wide text-[var(--board-path)]/90 sm:text-xs">
                {t("room.confirmEntryPrice")}
              </span>
            </button>
          ) : null}

          {isHost && onStartGame ? (
            <>
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
                <p className="-mt-1 text-center text-[0.65rem] text-[var(--board-path-border)] sm:text-xs">
                  {isCompetitive && !allEntriesPaid
                    ? t("room.playHintPayments")
                    : t("room.playHint")}
                </p>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={handleBackClick}
            className={`${retroBackButtonClassName} h-auto min-h-14 w-full min-w-0 sm:min-h-[3.75rem]`}
          >
            {leaving ? t("room.leaving") : t("room.back")}
          </button>

          {isHost && onCloseRoom ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCloseRoom}
              className={`${retroDangerButtonClassName} h-auto min-h-14 w-full min-w-0 sm:min-h-[3.75rem]`}
            >
              {closing ? t("room.closing") : t("room.closeRoom")}
            </button>
          ) : null}
        </div>
      ) : (
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
      )}

      {isCompetitive && self && !self.isHost && self.entryPaid ? (
        <p
          className={`${retroActionFont.className} text-[0.65rem] tracking-wide text-[var(--board-green)] sm:text-xs`}
        >
          {t("room.entryConfirmed")}
        </p>
      ) : null}

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

      {kickTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="kick-player-title"
              onClick={() => setConfirmKickId(null)}
            >
              <div
                className="w-full max-w-sm rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] p-5 text-[#173532] shadow-[6px_6px_0_#173532]"
                onClick={(event) => event.stopPropagation()}
              >
                <h2
                  id="kick-player-title"
                  className={`${retroActionFont.className} mb-3 text-[0.65rem]`}
                >
                  {t("room.kickTitle")}
                </h2>
                <p className="mb-5 text-sm leading-relaxed">
                  {t("room.kickMessage", { user: kickTarget.username })}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={retroBackButtonClassName}
                    onClick={() => setConfirmKickId(null)}
                  >
                    {t("room.kickCancel")}
                  </button>
                  <button
                    type="button"
                    className={retroDangerButtonClassName}
                    onClick={handleConfirmKick}
                  >
                    {t("room.kickConfirm")}
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
