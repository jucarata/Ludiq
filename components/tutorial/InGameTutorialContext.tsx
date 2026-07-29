"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useDice } from "@/components/dice/DiceContext";
import { useGameState } from "@/components/game/GameStateContext";
import { useTurn } from "@/components/game/TurnContext";
import { isProtectedAnchor } from "@/lib/board/cell-placements";
import {
  getPieceRouteCell,
  isDiceDoubles,
  type PieceIndex,
} from "@/lib/game/pieces";
import type { PlayerColor } from "@/lib/board/types";

export type TutorialAction = "continue" | "arm" | "throw" | "move";

export type TutorialFocusPiece = {
  player: PlayerColor;
  index: PieceIndex;
};

export type InGameTutorialStep =
  | "intro"
  | "click_dice"
  | "throw_board"
  | "need_doubles"
  | "click_dice_again"
  | "throw_doubles"
  | "explain_move"
  | "do_move"
  | "do_move_again"
  | "await_rival_exit"
  | "rival_exited"
  | "bot_moving"
  | "rival_moved"
  | "safe_click_dice"
  | "safe_throw"
  | "safe_move"
  | "safe_landed"
  | "finale"
  | "done";

type InGameTutorialContextValue = {
  active: boolean;
  step: InGameTutorialStep;
  allowedAction: TutorialAction | null;
  freezeBots: boolean;
  focusedPiece: TutorialFocusPiece | null;
  setStep: (step: InGameTutorialStep) => void;
  setFocusedPiece: (piece: TutorialFocusPiece | null) => void;
  advanceFromContinue: () => void;
  canSelectPiece: (player: PlayerColor, index: number) => boolean;
};

const InGameTutorialContext =
  createContext<InGameTutorialContextValue | null>(null);

export function useOptionalInGameTutorial() {
  return useContext(InGameTutorialContext);
}

export function useInGameTutorial() {
  const value = useContext(InGameTutorialContext);
  if (!value) {
    throw new Error("useInGameTutorial must be used within InGameTutorialProvider");
  }
  return value;
}

function allowedActionForStep(step: InGameTutorialStep): TutorialAction | null {
  switch (step) {
    case "intro":
    case "need_doubles":
    case "explain_move":
    case "rival_exited":
    case "rival_moved":
    case "safe_landed":
    case "finale":
      return "continue";
    case "click_dice":
    case "click_dice_again":
    case "safe_click_dice":
      return "arm";
    case "throw_board":
    case "throw_doubles":
    case "safe_throw":
      return "throw";
    case "do_move":
    case "do_move_again":
    case "safe_move":
      return "move";
    case "await_rival_exit":
    case "bot_moving":
    case "done":
      return null;
  }
}

function freezeBotsForStep(step: InGameTutorialStep): boolean {
  return step !== "done" && step !== "await_rival_exit" && step !== "bot_moving";
}

/** Holds tutorial step state — wrap above Turn/Dice so gates can read it. */
export function InGameTutorialProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<InGameTutorialStep>("intro");
  const [focusedPiece, setFocusedPiece] = useState<TutorialFocusPiece | null>(
    null,
  );

  const freezeBots = freezeBotsForStep(step);
  const allowedAction = allowedActionForStep(step);

  const canSelectPiece = useCallback(
    (player: PlayerColor, index: number) => {
      if (!focusedPiece) return true;
      if (step !== "do_move_again" && step !== "safe_move") return true;
      return focusedPiece.player === player && focusedPiece.index === index;
    },
    [focusedPiece, step],
  );

  const advanceFromContinue = useCallback(() => {
    setStep((current) => {
      if (current === "intro") return "click_dice";
      if (current === "need_doubles") return "click_dice_again";
      if (current === "explain_move") return "do_move";
      if (current === "rival_exited") return "bot_moving";
      if (current === "rival_moved") return "safe_click_dice";
      if (current === "safe_landed") return "finale";
      if (current === "finale") return "done";
      return current;
    });
  }, []);

  const value = useMemo<InGameTutorialContextValue>(
    () => ({
      active: step !== "done",
      step,
      allowedAction,
      freezeBots,
      focusedPiece,
      setStep,
      setFocusedPiece,
      advanceFromContinue,
      canSelectPiece,
    }),
    [
      step,
      allowedAction,
      freezeBots,
      focusedPiece,
      advanceFromContinue,
      canSelectPiece,
    ],
  );

  return (
    <InGameTutorialContext.Provider value={value}>
      {children}
    </InGameTutorialContext.Provider>
  );
}

/** Watches game state and advances steps. Mount inside DiceProvider. */
export function InGameTutorialEffects() {
  const {
    step,
    setStep,
    freezeBots,
    focusedPiece,
    setFocusedPiece,
  } = useInGameTutorial();
  const { setTimerFrozen, currentPlayer } = useTurn();
  const { isAiming, isRolling, turnRoll, exitRollAttempts } = useDice();
  const { pieces, remainingDice } = useGameState();
  const [wasRolling, setWasRolling] = useState(false);

  useEffect(() => {
    // Keep timer frozen during guided human steps; let it run for bot windows.
    setTimerFrozen(freezeBots);
    return () => setTimerFrozen(false);
  }, [freezeBots, setTimerFrozen]);

  useEffect(() => {
    if (isRolling) setWasRolling(true);
  }, [isRolling]);

  useEffect(() => {
    if (step !== "click_dice") return;
    if (isAiming) setStep("throw_board");
  }, [step, isAiming, setStep]);

  useEffect(() => {
    if (step !== "click_dice_again") return;
    if (isAiming) setStep("throw_doubles");
  }, [step, isAiming, setStep]);

  useEffect(() => {
    if (step !== "safe_click_dice") return;
    if (isAiming) setStep("safe_throw");
  }, [step, isAiming, setStep]);

  useEffect(() => {
    if (
      step !== "throw_board" &&
      step !== "throw_doubles" &&
      step !== "safe_throw"
    ) {
      return;
    }
    if (isAiming || isRolling || wasRolling) return;
    if (step === "throw_board") setStep("click_dice");
    else if (step === "throw_doubles") setStep("click_dice_again");
    else setStep("safe_click_dice");
  }, [step, isAiming, isRolling, wasRolling, setStep]);

  useEffect(() => {
    if (step !== "throw_board") return;
    if (!wasRolling || isRolling) return;
    if (!turnRoll || isDiceDoubles(turnRoll)) return;
    if (exitRollAttempts < 1) return;
    setWasRolling(false);
    setStep("need_doubles");
  }, [step, wasRolling, isRolling, turnRoll, exitRollAttempts, setStep]);

  useEffect(() => {
    if (step !== "throw_doubles") return;
    if (!wasRolling || isRolling) return;
    if (!turnRoll || !isDiceDoubles(turnRoll)) return;
    const redOnRoute = pieces.some(
      (p) => p.player === "red" && p.location === "route",
    );
    if (!redOnRoute) return;
    setWasRolling(false);
    setStep("explain_move");
  }, [step, wasRolling, isRolling, turnRoll, pieces, setStep]);

  useEffect(() => {
    if (step !== "safe_throw") return;
    if (!wasRolling || isRolling) return;
    if (!turnRoll) return;
    setWasRolling(false);
    // Focus the lead red piece (at routeIndex 4 after 2+2).
    const lead = pieces
      .filter((p) => p.player === "red" && p.location === "route")
      .sort((a, b) => (b.routeIndex ?? 0) - (a.routeIndex ?? 0))[0];
    if (lead) {
      setFocusedPiece({ player: lead.player, index: lead.index });
    }
    setStep("safe_move");
  }, [step, wasRolling, isRolling, turnRoll, pieces, setStep, setFocusedPiece]);

  // First move of the [2,2] pair → remember piece, ask to click it again.
  useEffect(() => {
    if (step !== "do_move") return;
    if (!remainingDice || remainingDice.length !== 1) return;
    const moved = pieces.find(
      (p) =>
        p.player === "red" &&
        p.location === "route" &&
        (p.routeIndex ?? 0) > 0,
    );
    if (!moved) return;
    setFocusedPiece({ player: moved.player, index: moved.index });
    setStep("do_move_again");
  }, [step, remainingDice, pieces, setStep, setFocusedPiece]);

  // Both moves done → wait for rival exit.
  useEffect(() => {
    if (step !== "do_move_again") return;
    if (remainingDice !== null && remainingDice.length > 0) return;
    if (currentPlayer === "blue" || remainingDice === null) {
      setStep("await_rival_exit");
    }
  }, [step, remainingDice, currentPlayer, setStep]);

  // Rival exited home — pause before they move.
  useEffect(() => {
    if (step !== "await_rival_exit") return;
    if (currentPlayer !== "blue") return;
    const blueOnRoute = pieces.some(
      (p) => p.player === "blue" && p.location === "route",
    );
    if (!blueOnRoute) return;
    if (!remainingDice || remainingDice.length === 0) return;
    setStep("rival_exited");
  }, [step, currentPlayer, pieces, remainingDice, setStep]);

  // After bot finishes its turn, coach capture awareness.
  useEffect(() => {
    if (step !== "bot_moving") return;
    if (currentPlayer !== "red") return;
    setFocusedPiece(null);
    setStep("rival_moved");
  }, [step, currentPlayer, setStep, setFocusedPiece]);

  // Landed on protected/safe after [3,1] moves.
  useEffect(() => {
    if (step !== "safe_move") return;
    const onSafe = pieces.some((p) => {
      if (p.player !== "red" || p.location !== "route") return false;
      if (focusedPiece && p.index !== focusedPiece.index) return false;
      const cell = getPieceRouteCell(p);
      return !!cell && isProtectedAnchor(cell.anchor) && (p.routeIndex ?? 0) >= 8;
    });
    if (onSafe) {
      setStep("safe_landed");
      return;
    }
    // Also advance when both dice spent even if detection lagged.
    if (remainingDice !== null && remainingDice.length === 0) {
      const lead = pieces.find(
        (p) =>
          p.player === "red" &&
          p.location === "route" &&
          (focusedPiece ? p.index === focusedPiece.index : true),
      );
      const cell = lead ? getPieceRouteCell(lead) : null;
      if (cell && isProtectedAnchor(cell.anchor)) {
        setStep("safe_landed");
      }
    }
  }, [step, pieces, remainingDice, focusedPiece, setStep]);

  return null;
}
