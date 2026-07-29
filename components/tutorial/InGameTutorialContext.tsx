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
import { isDiceDoubles, type PieceIndex } from "@/lib/game/pieces";
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
  | "bot_second"
  | "bot_moving_2"
  | "capture_intro"
  | "capture_click_dice"
  | "capture_throw"
  | "capture_with_2"
  | "capture_remaining_3"
  | "finale"
  | "done";

type InGameTutorialContextValue = {
  active: boolean;
  step: InGameTutorialStep;
  allowedAction: TutorialAction | null;
  freezeBots: boolean;
  focusedPiece: TutorialFocusPiece | null;
  /** When set, only this die value may be played. */
  forcedDieValue: number | null;
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
    case "capture_intro":
    case "finale":
      return "continue";
    case "click_dice":
    case "click_dice_again":
    case "capture_click_dice":
      return "arm";
    case "throw_board":
    case "throw_doubles":
    case "capture_throw":
      return "throw";
    case "do_move":
    case "do_move_again":
    case "capture_with_2":
    case "capture_remaining_3":
      return "move";
    case "await_rival_exit":
    case "bot_moving":
    case "bot_second":
    case "bot_moving_2":
    case "done":
      return null;
  }
}

function freezeBotsForStep(step: InGameTutorialStep): boolean {
  return (
    step !== "done" &&
    step !== "await_rival_exit" &&
    step !== "bot_moving" &&
    step !== "bot_second" &&
    step !== "bot_moving_2"
  );
}

/** Holds tutorial step state — wrap above Turn/Dice so gates can read it. */
export function InGameTutorialProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<InGameTutorialStep>("intro");
  const [focusedPiece, setFocusedPiece] = useState<TutorialFocusPiece | null>(
    null,
  );

  const freezeBots = freezeBotsForStep(step);
  const allowedAction = allowedActionForStep(step);

  const forcedDieValue = step === "capture_with_2" ? 2 : null;

  const canSelectPiece = useCallback(
    (player: PlayerColor, index: number) => {
      if (!focusedPiece) return true;
      if (step !== "do_move_again" && step !== "capture_with_2") return true;
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
      if (current === "capture_intro") return "capture_click_dice";
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
      forcedDieValue,
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
      forcedDieValue,
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
  const { setTimerFrozen, currentPlayer, advanceTurn } = useTurn();
  const { isAiming, isRolling, turnRoll, exitRollAttempts } = useDice();
  const { pieces, remainingDice } = useGameState();
  const [wasRolling, setWasRolling] = useState(false);

  useEffect(() => {
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
    if (step !== "capture_click_dice") return;
    if (isAiming) setStep("capture_throw");
  }, [step, isAiming, setStep]);

  useEffect(() => {
    if (
      step !== "throw_board" &&
      step !== "throw_doubles" &&
      step !== "capture_throw"
    ) {
      return;
    }
    if (isAiming || isRolling || wasRolling) return;
    if (step === "throw_board") setStep("click_dice");
    else if (step === "throw_doubles") setStep("click_dice_again");
    else setStep("capture_click_dice");
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
    if (step !== "capture_throw") return;
    if (!wasRolling || isRolling) return;
    if (!turnRoll) return;
    setWasRolling(false);

    const exitPiece = pieces.find(
      (p) =>
        p.player === "red" &&
        p.location === "route" &&
        p.routeIndex === 0,
    );
    if (exitPiece) {
      setFocusedPiece({ player: exitPiece.player, index: exitPiece.index });
    }
    setStep("capture_with_2");
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
      setFocusedPiece(null);
      setStep("await_rival_exit");
    }
  }, [step, remainingDice, currentPlayer, setStep, setFocusedPiece]);

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

  // First bot turn done → immediately grant a second bot turn.
  useEffect(() => {
    if (step !== "bot_moving") return;
    if (currentPlayer !== "red") return;
    setStep("bot_second");
    advanceTurn();
  }, [step, currentPlayer, setStep, advanceTurn]);

  useEffect(() => {
    if (step !== "bot_second") return;
    if (currentPlayer !== "blue") return;
    setStep("bot_moving_2");
  }, [step, currentPlayer, setStep]);

  // Second bot turn done → teach capture.
  useEffect(() => {
    if (step !== "bot_moving_2") return;
    if (currentPlayer !== "red") return;
    setFocusedPiece(null);
    setStep("capture_intro");
  }, [step, currentPlayer, setStep, setFocusedPiece]);

  // Used the 2 to capture → free move with the leftover 3.
  useEffect(() => {
    if (step !== "capture_with_2") return;
    if (!remainingDice || remainingDice.length !== 1) return;
    if (remainingDice[0] !== 3) return;
    if (!focusedPiece) return;
    const mover = pieces.find(
      (p) =>
        p.player === focusedPiece.player && p.index === focusedPiece.index,
    );
    // Wait until the capture step animation reaches the rival's cell.
    if (!mover || mover.routeIndex !== 2) return;
    setFocusedPiece(null);
    setStep("capture_remaining_3");
  }, [step, remainingDice, pieces, focusedPiece, setStep, setFocusedPiece]);

  // Spent the 3 → finale.
  useEffect(() => {
    if (step !== "capture_remaining_3") return;
    if (remainingDice !== null && remainingDice.length > 0) return;
    setStep("finale");
  }, [step, remainingDice, setStep]);

  return null;
}
