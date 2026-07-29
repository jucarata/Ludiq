"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FaChampagneGlasses, FaCircleQuestion } from "react-icons/fa6";
import { formatUnits, parseUnits } from "viem";
import { GamePiece } from "@/components/board/GamePiece";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { DiceWaitScreen } from "@/components/multiplayer/DiceWaitScreen";
import { PiggyBank } from "@/components/multiplayer/PiggyBank";
import {
  PLAYER_COLORS,
  type PlayerColor,
} from "@/lib/board/types";
import {
  calcPartyFeeRaw,
  calcPartyTotalRaw,
  COMPETITIVE_TOKEN,
  PARTY_MIN_POOL_USDT,
} from "@/lib/celo/constants";
import {
  brandTitleFont,
  retroActionFont,
  retroBackButtonClassName,
  retroDangerButtonClassName,
  retroPlayButtonClassName,
} from "@/lib/fonts";
import { getPlayerColorLabel } from "@/lib/i18n";
import { availableColors } from "@/lib/room/colors";
import { isPartyMode } from "@/lib/room/mode";
import type { RoomView } from "@/lib/room/types";

type RoomLobbyProps = {
  room: RoomView;
  changingColor?: boolean;
  closing?: boolean;
  leaving?: boolean;
  kicking?: boolean;
  starting?: boolean;
  enablingParty?: boolean;
  contributing?: boolean;
  error?: string | null;
  onSelectColor: (color: PlayerColor) => void;
  onLeave: () => void;
  onCloseRoom?: () => void;
  onKickPlayer?: (playerId: string) => void;
  onStartGame?: () => void;
  onEnableParty?: () => void;
  onContribute?: (poolAmountUsdt: string) => void;
};

type BubbleAnchor = { x: number; y: number };

function partyFeePreview(amount: string): { fee: string; total: string } | null {
  const trimmed = amount.trim();
  if (!trimmed || Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
    return null;
  }
  try {
    const poolRaw = parseUnits(trimmed, COMPETITIVE_TOKEN.decimals);
    const feeRaw = calcPartyFeeRaw(poolRaw);
    const totalRaw = calcPartyTotalRaw(poolRaw);
    return {
      fee: formatUnits(feeRaw, COMPETITIVE_TOKEN.decimals),
      total: formatUnits(totalRaw, COMPETITIVE_TOKEN.decimals),
    };
  } catch {
    return null;
  }
}

export function RoomLobby({
  room,
  changingColor = false,
  closing = false,
  leaving = false,
  kicking = false,
  starting = false,
  enablingParty = false,
  contributing = false,
  error = null,
  onSelectColor,
  onLeave,
  onCloseRoom,
  onKickPlayer,
  onStartGame,
  onEnableParty,
  onContribute,
}: RoomLobbyProps) {
  const { t, locale } = useTranslations();
  const [picking, setPicking] = useState(false);
  const [anchor, setAnchor] = useState<BubbleAnchor | null>(null);
  const [mounted, setMounted] = useState(false);
  const [confirmHostLeave, setConfirmHostLeave] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);
  const [partyHelpOpen, setPartyHelpOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeInvalid, setContributeInvalid] = useState(false);
  const pieceButtonRef = useRef<HTMLButtonElement | null>(null);

  const self = room.players.find((player) => player.isSelf) ?? null;
  const isHost = Boolean(self?.isHost);
  const isParty = isPartyMode(room.mode);
  const canStartGame =
    isHost &&
    Boolean(onStartGame) &&
    room.status === "waiting" &&
    room.players.length >= 2 &&
    room.players.length <= 4;
  const busy =
    changingColor ||
    closing ||
    leaving ||
    kicking ||
    starting ||
    enablingParty ||
    contributing;
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
  const feePreview = partyFeePreview(contributeAmount);
  const showProfileLink =
    error === t("room.enablePartyAuth") ||
    error === t("room.depositWalletRequired");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (contributing) setContributeOpen(false);
  }, [contributing]);

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

  const openContributeModal = () => {
    if (busy) return;
    setContributeInvalid(false);
    setContributeOpen(true);
  };

  const closeContributeModal = () => {
    if (contributing) return;
    setContributeOpen(false);
    setContributeInvalid(false);
  };

  const handleContributeClick = () => {
    if (!onContribute || busy) return;
    const trimmed = contributeAmount.trim();
    const value = Number(trimmed);
    if (!trimmed || Number.isNaN(value) || value < Number(PARTY_MIN_POOL_USDT)) {
      setContributeInvalid(true);
      return;
    }
    setContributeInvalid(false);
    setContributeOpen(false);
    onContribute(trimmed);
    setContributeAmount("");
  };

  const lobbySecondaryBtnClass =
    "!h-11 min-h-0 min-w-0 flex-1 px-3 !text-sm shadow-[3px_3px_0_var(--brand-navy)] sm:!h-12 sm:px-4 sm:!text-base";

  const potCoinCount =
    room.potAmountUsdt > 0
      ? Math.min(6, Math.max(1, Math.round(room.potAmountUsdt * 10)))
      : 0;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-4 sm:gap-5 sm:py-5">
      {starting ? (
        <DiceWaitScreen title={t("room.waitStarting")} overlay />
      ) : null}
      {enablingParty ? (
        <DiceWaitScreen title={t("room.enablingParty")} overlay />
      ) : null}
      {contributing ? (
        <DiceWaitScreen
          title={t("room.waitShuffle")}
          hint={t("room.waitWalletHint")}
          overlay
        />
      ) : null}
      {!starting && !enablingParty && !contributing && closing ? (
        <DiceWaitScreen title={t("room.closing")} overlay />
      ) : null}
      {!starting && !enablingParty && !contributing && !closing && leaving ? (
        <DiceWaitScreen
          title={t("room.leaving")}
          hint={t("room.waitWalletHint")}
          overlay
        />
      ) : null}
      {!starting &&
      !enablingParty &&
      !contributing &&
      !closing &&
      !leaving &&
      kicking ? (
        <DiceWaitScreen
          title={t("room.kicking")}
          hint={t("room.waitWalletHint")}
          overlay
        />
      ) : null}

      <section
        aria-labelledby="room-code-heading"
        className="flex w-full max-w-sm flex-col items-center gap-1.5"
      >
        <h1
          id="room-code-heading"
          className={`${brandTitleFont.className} text-3xl font-extrabold tracking-wide text-[var(--brand-cream)] sm:text-4xl`}
        >
          {t("room.roomHeading")}
        </h1>
        <p
          className={`${brandTitleFont.className} select-all rounded-2xl border-4 border-[var(--brand-turquoise)]/40 bg-[#1e2158] px-6 py-3 text-2xl font-extrabold tracking-[0.35em] text-[var(--brand-cream)] sm:text-3xl`}
          aria-label={t("room.codeAria", { code: room.code })}
        >
          {room.code}
        </p>
        <p className="text-center text-xs text-[var(--board-path-border)] sm:text-sm">
          {t("room.codeHint")}
        </p>
      </section>

      {isParty ? (
        <section
          aria-label={t("room.potLabel")}
          className="w-full max-w-sm"
        >
          <div className="flex w-full items-center gap-3 rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(120deg,#2a307a_0%,#1a1e52_48%,#14174d_100%)] px-3 py-2.5 shadow-[4px_4px_0_var(--brand-navy)]">
            <PiggyBank
              className="piggy-bob h-11 w-auto shrink-0 sm:h-12"
              coinCount={potCoinCount}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`${brandTitleFont.className} rounded bg-[var(--brand-mint)] px-1.5 py-px text-[0.55rem] font-extrabold uppercase tracking-wide text-white shadow-[1px_1px_0_var(--brand-navy)]`}
                >
                  {t("room.partyActive")}
                </span>
              </div>
              <p
                className={`${brandTitleFont.className} mt-0.5 truncate text-lg font-extrabold tracking-wide text-[var(--brand-yellow)] sm:text-xl`}
              >
                {room.potAmountUsdt > 0
                  ? t("room.potAmount", {
                      amount: room.potAmountUsdt.toFixed(2),
                    })
                  : t("room.potAmountPending")}
              </p>
              <p className="text-[0.65rem] uppercase tracking-wide text-[var(--brand-cream)]/55">
                {t("room.potLabel")}
              </p>
            </div>
            {onContribute ? (
              <button
                type="button"
                disabled={busy}
                onClick={openContributeModal}
                className={`${brandTitleFont.className} flex h-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-turquoise)] px-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_var(--brand-navy)] transition hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-45 sm:h-12 sm:px-4 sm:text-sm`}
              >
                {t("room.contributeAction")}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="players-heading"
        className="flex w-full max-w-sm flex-col items-center gap-2"
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
            const hasContributed =
              isParty && player.contributedPoolUsdt > 0;
            const showKick =
              canKickPlayers && !isSelf && !player.isHost;
            const paymentBorderClass = hasContributed
              ? "border-[var(--board-green)]"
              : "border-[var(--board-path-border)]";
            const paymentBorderMutedClass = hasContributed
              ? "border-[var(--board-green)]"
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
                      className="absolute right-0 top-0 z-10 flex h-4 w-4 translate-x-[5px] -translate-y-[5px] items-center justify-center rounded-sm border border-[#173532] bg-[var(--board-red)] text-sm font-black leading-none text-[var(--board-path)] shadow-[1px_1px_0_#173532] transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
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
                        boxShadow: hasContributed
                          ? "0 0 12px color-mix(in srgb, var(--board-green) 55%, transparent)"
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
                        hasContributed
                          ? {
                              boxShadow:
                                "0 0 12px color-mix(in srgb, var(--board-green) 45%, transparent)",
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
                  className={`max-w-full truncate text-center text-base font-semibold sm:text-xs ${
                    isSelf
                      ? "text-[var(--board-green)]"
                      : "text-[var(--board-path-border)]"
                  }`}
                >
                  @{player.username}
                </span>
                {hasContributed ? (
                  <span className="rounded-md bg-[var(--board-green)]/20 px-1.5 py-0.5 text-[0.6rem] font-bold text-[var(--board-green)] sm:text-[0.65rem]">
                    {t("room.contributedBadge", {
                      amount: player.contributedPoolUsdt.toFixed(2),
                    })}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-1.5">
          <p className="text-center text-xs text-[var(--board-red)] sm:text-sm">
            {error}
          </p>
          {showProfileLink ? (
            <Link
              href="/profile"
              className="text-xs font-semibold text-[var(--brand-mint)] underline underline-offset-2 sm:text-sm"
            >
              {t("room.goToProfile")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex w-full max-w-sm flex-col items-center gap-2">
        {isHost && !isParty && onEnableParty ? (
          <div className="relative w-full">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPartyHelpOpen(true)}
              className="absolute -top-2 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--brand-navy)] bg-[var(--brand-yellow)] text-[var(--brand-navy)] shadow-[2px_2px_0_var(--brand-navy)] transition hover:brightness-105 active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--brand-navy)] disabled:opacity-50"
              aria-label={t("room.enablePartyHelpAria")}
            >
              <FaCircleQuestion className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onEnableParty}
              className={`${brandTitleFont.className} group relative flex w-full flex-col items-center gap-0.5 overflow-hidden rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-coral)] px-4 py-3 text-[var(--brand-navy)] shadow-[5px_5px_0_var(--brand-navy)] transition hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label={t("room.enableParty")}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)]"
              />
              <span className="relative flex items-center gap-2 text-lg font-extrabold uppercase tracking-wide sm:text-xl">
                <FaChampagneGlasses className="h-5 w-5 animate-bounce sm:h-6 sm:w-6" />
                {t("room.enableParty")}
              </span>
              <span className="relative text-[0.65rem] font-semibold normal-case tracking-wide text-[var(--brand-navy)]/80 sm:text-xs">
                {t("room.enablePartyHint")}
              </span>
            </button>
          </div>
        ) : null}

        {isHost && onStartGame ? (
          <>
            <button
              type="button"
              disabled={busy || !canStartGame}
              onClick={onStartGame}
              className={`${retroPlayButtonClassName} !h-12 min-h-0 w-full min-w-0 px-4 !text-base sm:!h-[3.25rem] sm:!text-lg`}
              aria-label={t("room.play")}
            >
              {starting ? t("room.starting") : t("room.play")}
            </button>
            {!canStartGame && !starting ? (
              <p className="-mt-0.5 text-center text-xs text-[var(--board-path-border)]">
                {t("room.playHint")}
              </p>
            ) : null}
          </>
        ) : null}

        <div className="flex w-full gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleBackClick}
            className={`${retroBackButtonClassName} ${lobbySecondaryBtnClass}`}
          >
            {leaving ? t("room.leaving") : t("room.back")}
          </button>
          {isHost && onCloseRoom ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCloseRoom}
              className={`${retroDangerButtonClassName} ${lobbySecondaryBtnClass}`}
            >
              {closing ? t("room.closing") : t("room.closeRoom")}
            </button>
          ) : null}
        </div>
      </div>

      {partyHelpOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="party-help-title"
              onClick={() => setPartyHelpOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-xl border-[3px] border-[#173532] bg-[var(--board-path)] p-5 text-[#173532] shadow-[6px_6px_0_#173532]"
                onClick={(event) => event.stopPropagation()}
              >
                <h2
                  id="party-help-title"
                  className={`${retroActionFont.className} mb-3 text-base`}
                >
                  {t("room.enablePartyHelpTitle")}
                </h2>
                <p className="mb-5 text-sm leading-relaxed">
                  {t("room.enablePartyHelpBody")}
                </p>
                <button
                  type="button"
                  className={`${retroPlayButtonClassName} w-full min-w-0`}
                  onClick={() => setPartyHelpOpen(false)}
                >
                  {t("room.enablePartyHelpClose")}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {contributeOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="contribute-modal-title"
              onClick={closeContributeModal}
            >
              <div
                className="w-full max-w-sm overflow-hidden rounded-2xl border-[3px] border-[var(--brand-navy)] bg-[linear-gradient(165deg,#2a307a_0%,#1a1e52_55%,#14174d_100%)] p-5 text-[var(--brand-cream)] shadow-[6px_6px_0_var(--brand-navy)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex flex-col items-center text-center">
                  <PiggyBank
                    className="piggy-bob h-16 w-auto"
                    coinCount={potCoinCount}
                  />
                  <h2
                    id="contribute-modal-title"
                    className={`${brandTitleFont.className} mt-1 text-xl font-extrabold uppercase tracking-wide text-[var(--brand-yellow)]`}
                  >
                    {t("room.contribute")}
                  </h2>
                  <p
                    className={`${brandTitleFont.className} mt-0.5 text-base font-extrabold tracking-wide text-[var(--brand-cream)]`}
                  >
                    {room.potAmountUsdt > 0
                      ? t("room.potAmount", {
                          amount: room.potAmountUsdt.toFixed(2),
                        })
                      : t("room.potAmountPending")}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-[var(--brand-cream)]/65">
                    {t("room.contributeModalHint")}
                  </p>
                </div>

                <label
                  htmlFor="party-contribute-amount"
                  className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--brand-cream)]/70"
                >
                  {t("room.contributeAmountLabel")}
                </label>
                <div className="relative">
                  <input
                    id="party-contribute-amount"
                    type="number"
                    inputMode="decimal"
                    min={PARTY_MIN_POOL_USDT}
                    step="0.01"
                    placeholder="0.00"
                    autoFocus
                    value={contributeAmount}
                    disabled={busy}
                    onChange={(event) => {
                      setContributeAmount(event.target.value);
                      setContributeInvalid(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleContributeClick();
                      }
                    }}
                    className={`${brandTitleFont.className} h-14 w-full rounded-xl border-[3px] border-[var(--brand-navy)] bg-[#12153f] px-4 pr-16 text-2xl font-extrabold tracking-wide text-[var(--brand-cream)] outline-none placeholder:text-[var(--brand-cream)]/25 focus:border-[var(--brand-turquoise)] disabled:opacity-50`}
                    aria-label={t("room.contributeAmountLabel")}
                  />
                  <span
                    className={`${brandTitleFont.className} pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold uppercase tracking-wide text-[var(--brand-turquoise)]`}
                  >
                    USDT
                  </span>
                </div>

                {feePreview ? (
                  <p className="mt-2 text-center text-xs leading-snug text-[var(--brand-cream)]/70">
                    {t("room.contributePreview", {
                      total: feePreview.total,
                      fee: feePreview.fee,
                    })}
                  </p>
                ) : null}
                {contributeInvalid ? (
                  <p className="mt-2 text-center text-xs text-[var(--brand-coral)]">
                    {t("room.contributeMin")}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleContributeClick}
                    className={`${brandTitleFont.className} flex h-12 w-full items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-turquoise)] text-base font-extrabold uppercase tracking-wide text-white shadow-[4px_4px_0_var(--brand-navy)] transition hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    {t("room.contributeAction")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={closeContributeModal}
                    className={`${brandTitleFont.className} flex h-11 w-full items-center justify-center rounded-xl border-[3px] border-[var(--brand-navy)] bg-[var(--brand-cream)] text-sm font-extrabold uppercase tracking-wide text-[var(--brand-navy)] shadow-[3px_3px_0_var(--brand-navy)] transition hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--brand-navy)] disabled:opacity-45`}
                  >
                    {t("room.contributeCancel")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
                  className={`${retroActionFont.className} mb-3 text-base`}
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
                  className={`${retroActionFont.className} mb-3 text-base`}
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
