"use client";

import { useState, type ReactNode } from "react";
import { FaArrowRotateRight } from "react-icons/fa6";
import { DieFace } from "@/components/dice/DieFace";
import { useDice } from "@/components/dice/DiceContext";
import { useAutoMode } from "@/components/game/AutoModeContext";
import { useGameState } from "@/components/game/GameStateContext";
import { useIsBot, useActivePlayers } from "@/components/game/PlayersContext";
import { useTurn } from "@/components/game/TurnContext";
import { AutoModeToggles } from "@/components/turn/AutoModeToggles";
import { PlayerIcon } from "@/components/turn/PlayerIcon";
import { useOptionalOnlineSession } from "@/components/multiplayer/online/OnlineSessionContext";
import { useOptionalInGameTutorial } from "@/components/tutorial/InGameTutorialContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { getPlayerColorLabel } from "@/lib/i18n";
import { PLAYER_COLORS, type PlayerColor } from "@/lib/board/types";
import { canPaidDiceReroll } from "@/lib/game/reroll";
import { REROLL_COST_KOINS } from "@/lib/koin/currency";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNER_BY_COLOR: Record<PlayerColor, Corner> = {
  red: "top-left",
  green: "top-right",
  yellow: "bottom-left",
  blue: "bottom-right",
};

/** Circle on the outer edge; dice sit toward the board center. */
const ROW_CLASS: Record<Corner, string> = {
  "top-left": "flex-row",
  "top-right": "flex-row-reverse",
  "bottom-left": "flex-row",
  "bottom-right": "flex-row-reverse",
};

/** Sit just outside the board corner (above top / below bottom). */
const CORNER_CLASS: Record<Corner, string> = {
  "top-left": "left-0 top-0 -translate-y-[calc(100%+0.4rem)]",
  "top-right": "right-0 top-0 -translate-y-[calc(100%+0.4rem)]",
  "bottom-left": "bottom-0 left-0 translate-y-[calc(100%+0.4rem)]",
  "bottom-right": "bottom-0 right-0 translate-y-[calc(100%+0.4rem)]",
};

const DIE = "h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7";
const IDLE_FACES: [number, number] = [3, 5];

/** Side arrow pointing at the dock (← left docks, → right docks). */
function TurnArrow({
  fill,
  side,
}: {
  fill: string;
  side: "left" | "right";
}) {
  return (
    <div
      className="pointer-events-none z-10 shrink-0"
      aria-hidden
      style={{ color: fill }}
    >
      <svg
        viewBox="0 0 20 24"
        className={`h-5 w-4 drop-shadow-md sm:h-6 sm:w-5 ${
          side === "left" ? "" : "rotate-180"
        }`}
      >
        <path
          d="M18 12 L4 22 L4 2 Z"
          fill="currentColor"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function PlayerDock({
  color,
  isActive,
  timeLeft,
  isBot,
  nameTag,
  isSelf,
}: {
  color: PlayerColor;
  isActive: boolean;
  timeLeft: number;
  isBot: boolean;
  nameTag: string;
  isSelf: boolean;
}) {
  const corner = CORNER_BY_COLOR[color];
  const { fill, dark } = PLAYER_COLORS[color];
  const { t, locale } = useTranslations();
  const label = getPlayerColorLabel(locale, color);
  const { isAutoEnabled } = useAutoMode();
  const { turnPhase } = useTurn();
  const { remainingDice, rerollEligible } = useGameState();
  const {
    isAiming,
    isRolling,
    canRoll,
    turnRoll,
    armDice,
    cancelAim,
    requestPaidReroll,
  } = useDice();
  const [rerollBusy, setRerollBusy] = useState(false);

  const currentIsBot = isBot;
  const currentIsAutoHuman = !currentIsBot && isAutoEnabled(color);
  const tutorial = useOptionalInGameTutorial();
  const tutorialBlocksArm =
    !!tutorial?.active && tutorial.allowedAction !== "arm";
  const interactive =
    isActive &&
    canRoll &&
    !isRolling &&
    !currentIsBot &&
    !currentIsAutoHuman &&
    !tutorialBlocksArm;

  const canRerollNow =
    isActive &&
    isSelf &&
    !currentIsBot &&
    !isRolling &&
    !rerollBusy &&
    canPaidDiceReroll({
      turnPhase,
      remainingDice,
      rerollEligible,
      tutorialActive: !!tutorial?.active,
    });

  /* Only the local human sees their own reroll control — never rivals or bots. */
  const showReroll = isSelf && !currentIsBot;

  /* While the 3-D dice are tumbling show "?" placeholders on the mini dice. */
  const rolling = isActive && isRolling;
  const showRollResult = isActive && turnRoll !== null && !isRolling;

  const faces: [number | null, number | null] = rolling
    ? [null, null]
    : showRollResult && turnRoll
      ? turnRoll
      : IDLE_FACES;

  const handleDiceClick = () => {
    if (!interactive) return;
    if (isAiming) cancelAim();
    else armDice();
  };

  const handleRerollClick = async () => {
    if (!canRerollNow) return;
    setRerollBusy(true);
    try {
      const result = await requestPaidReroll();
      if (result === "insufficient") {
        window.alert(t("turn.rerollInsufficient", { cost: REROLL_COST_KOINS }));
      } else if (result === "unauthorized") {
        window.alert(t("turn.rerollAuth"));
      } else if (result === "error") {
        window.alert(t("turn.rerollError"));
      }
    } finally {
      setRerollBusy(false);
    }
  };

  const isLeft = corner === "top-left" || corner === "bottom-left";
  const isTop = corner === "top-left" || corner === "top-right";
  const aiming = isActive && isAiming;
  const frameBorder = aiming ? "#fcd34d" : isActive ? fill : dark;
  const frameGlow = aiming
    ? "0 0 0 1px #fcd34d99, 0 0 18px #fcd34d88"
    : isActive
      ? `0 0 0 1px ${fill}66, 0 0 16px ${fill}44`
      : `0 2px 8px rgba(0,0,0,0.35)`;
  const frameBackground = aiming
    ? "linear-gradient(180deg, #3d3520f2 0%, #1a1a2ef2 70%)"
    : `linear-gradient(${
        isLeft ? "90deg" : "270deg"
      }, ${fill}33 0%, #1a1a2ef2 55%)`;

  const diceButton = (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={handleDiceClick}
        disabled={!interactive}
        aria-pressed={aiming}
        aria-label={
          interactive
            ? aiming
              ? t("dice.cancelRoll")
              : t("dice.rollTurn", { label })
            : t("dice.rolled", {
                label,
                d1: faces[0],
                d2: faces[1],
              })
        }
        className={`flex items-center gap-0.5 rounded-lg border-2 px-1 py-0.5 transition-all sm:gap-1 sm:px-1.5 sm:py-1 ${
          aiming ? "animate-pulse" : ""
        } ${interactive ? "hover:brightness-110" : "cursor-default"} disabled:opacity-100 ${
          isActive ? "opacity-100" : "opacity-75"
        }`}
        style={{
          borderColor: frameBorder,
          background: frameBackground,
          boxShadow: frameGlow,
        }}
      >
        <DieFace
          value={faces[0]}
          className={`${DIE} ${isActive ? "" : "opacity-55"} ${
            isActive && isRolling ? "animate-pulse" : ""
          }`}
        />
        <DieFace
          value={faces[1]}
          className={`${DIE} ${isActive ? "" : "opacity-55"} ${
            isActive && isRolling ? "animate-pulse" : ""
          }`}
        />
      </button>

      {showReroll ? (
        <button
          type="button"
          onClick={() => void handleRerollClick()}
          disabled={!canRerollNow}
          title={t("turn.rerollHint", { cost: REROLL_COST_KOINS })}
          aria-label={t("turn.rerollAria", { cost: REROLL_COST_KOINS })}
          className={`flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-lg border-2 transition-all sm:h-8 sm:w-8 ${
            canRerollNow
              ? "border-[#fcd34d] bg-[#3d3520] text-[#fcd34d] hover:brightness-110"
              : "cursor-default border-[#2a2a3e] bg-[#1a1a2e]/80 text-[#fefae0]/35"
          }`}
        >
          <FaArrowRotateRight
            className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${rerollBusy ? "animate-spin" : ""}`}
            aria-hidden
          />
          <span className="font-mono text-[7px] font-bold leading-none tabular-nums sm:text-[8px]">
            {REROLL_COST_KOINS}
          </span>
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className={`absolute z-20 flex items-center gap-1 ${CORNER_CLASS[corner]} ${
        isLeft ? "flex-row" : "flex-row-reverse"
      }`}
      aria-current={isActive ? "true" : undefined}
    >
      <div
        className={`flex items-center gap-1 sm:gap-1.5 ${ROW_CLASS[corner]}`}
      >
        <PlayerIcon
          color={color}
          isActive={isActive}
          label={isBot ? `${label} (${t("turn.cpu")})` : label}
          nameTag={nameTag}
          isSelf={isSelf}
          badge={
            isActive ? (
              <span className="absolute -right-1 -top-1 z-20 rounded-md bg-[#fcd34d] px-1 py-0.5 font-mono text-[10px] font-bold tabular-nums text-[#1a1a2e] shadow-[0_0_8px_rgba(252,211,77,0.45)] sm:text-xs">
                {timeLeft}s
              </span>
            ) : null
          }
        />

        {/* Compact dice frame + Auto stacked by orientation */}
        <div className="flex w-max flex-col items-start gap-1 sm:gap-1.5">
          {isTop ? (
            <>
              {diceButton}
              <AutoModeToggles color={color} />
            </>
          ) : (
            <>
              <AutoModeToggles color={color} />
              {diceButton}
            </>
          )}
        </div>
      </div>

      {isActive && <TurnArrow fill={fill} side={isLeft ? "right" : "left"} />}
    </div>
  );
}

interface BoardPlayerDocksProps {
  children: ReactNode;
}

/**
 * Board shell with per-corner player markers and static dice.
 * Docks sit just outside the board corners; active turn uses a side arrow.
 */
export function BoardPlayerDocks({ children }: BoardPlayerDocksProps) {
  const { currentPlayer, timeLeft } = useTurn();
  const activePlayers = useActivePlayers();
  const isBot = useIsBot();
  const { t } = useTranslations();
  const online = useOptionalOnlineSession();

  const nameFor = (color: PlayerColor) => {
    if (online) {
      const player = online.room.players.find((entry) => entry.color === color);
      const username = player?.username?.trim();
      if (username) return username;
    }
    return isBot(color) ? t("turn.bot") : t("turn.you");
  };

  const isSelfFor = (color: PlayerColor) => {
    if (online) {
      return online.room.players.some(
        (entry) => entry.color === color && entry.isSelf,
      );
    }
    return !isBot(color);
  };

  return (
    <div
      className="relative flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center px-1 py-[3.75rem] sm:px-2 sm:py-[4.25rem] md:py-[4.75rem]"
      aria-label={t("turn.panel")}
    >
      <div className="relative flex max-h-full max-w-full items-center justify-center">
        {activePlayers.map((color) => (
          <PlayerDock
            key={color}
            color={color}
            isActive={color === currentPlayer}
            timeLeft={timeLeft}
            isBot={isBot(color)}
            nameTag={nameFor(color)}
            isSelf={isSelfFor(color)}
          />
        ))}
        <div className="relative z-10 flex max-h-full max-w-full items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
