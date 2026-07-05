"use client";

import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { useDice } from "@/components/dice/DiceContext";
import { useGameState } from "@/components/game/GameStateContext";
import { PieceMoveMenuOverlay } from "@/components/board/PieceMoveMenu";
import { DicePairVisual } from "@/components/dice/DicePairVisual";
import { DiceRollOverlay } from "@/components/dice/DiceRollOverlay";
import {
  computeThrowVelocity,
  normalizeThrowVelocity,
  type VelocitySample,
} from "@/lib/game/dice";

interface BoardDiceZoneProps {
  children: ReactNode;
}

export function BoardDiceZone({ children }: BoardDiceZoneProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const samplesRef = useRef<VelocitySample[]>([]);
  const isDraggingRef = useRef(false);
  const { isAiming, isRolling, canRoll, throwDice, reportDieSettled, activeDice, setBoardDragging } = useDice();
  const { selectedPiece, clearSelection, canInteractWithPieces } = useGameState();
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  );

  const getLocalCoords = (clientX: number, clientY: number) => {
    const rect = zoneRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isAiming || isRolling || !canRoll || !zoneRef.current) return;

    isDraggingRef.current = true;
    setBoardDragging(true);
    zoneRef.current.setPointerCapture(event.pointerId);

    const coords = getLocalCoords(event.clientX, event.clientY);
    samplesRef.current = [{ ...coords, t: performance.now() }];
    setDragPoint(coords);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const coords = getLocalCoords(event.clientX, event.clientY);
    samplesRef.current.push({ ...coords, t: performance.now() });

    if (samplesRef.current.length > 24) {
      samplesRef.current = samplesRef.current.slice(-24);
    }

    setDragPoint(coords);
  };

  const finishThrow = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !zoneRef.current) return;

    isDraggingRef.current = false;
    setBoardDragging(false);
    setDragPoint(null);

    const coords = getLocalCoords(clientX, clientY);
    const rect = zoneRef.current.getBoundingClientRect();
    const rawVelocity = computeThrowVelocity(samplesRef.current);
    const velocity = normalizeThrowVelocity(rawVelocity.vx, rawVelocity.vy);

    throwDice({
      x: coords.x,
      y: coords.y,
      vx: velocity.vx,
      vy: velocity.vy,
      bounds: { width: rect.width, height: rect.height },
    });

    samplesRef.current = [];
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    finishThrow(event.clientX, event.clientY);
    zoneRef.current?.releasePointerCapture(event.pointerId);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    setBoardDragging(false);
    setDragPoint(null);
    samplesRef.current = [];
    zoneRef.current?.releasePointerCapture(event.pointerId);
  };

  const handleBoardClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (selectedPiece && canInteractWithPieces && !isAiming && !isRolling) {
      clearSelection();
    }
  };

  return (
    <div
      ref={zoneRef}
      className={`relative touch-none ${isAiming ? "cursor-none" : canInteractWithPieces ? "cursor-default" : ""}`}
      onClick={handleBoardClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      data-dice-zone={isAiming ? "armed" : undefined}
    >
      {children}
      {dragPoint && isAiming && (
        <div
          className="pointer-events-none absolute z-[35] -translate-x-1/2 -translate-y-1/2 opacity-90"
          style={{ left: dragPoint.x, top: dragPoint.y }}
          aria-hidden
        >
          <DicePairVisual sizeClass="h-12 w-12 md:h-14 md:w-14" />
        </div>
      )}
      {activeDice?.map((die) => (
        <DiceRollOverlay
          key={`${die.sessionId}-${die.key}`}
          roll={die}
          onSettled={(value) => reportDieSettled(die.key, value)}
        />
      ))}
      {isAiming && (
        <div
          className="pointer-events-none absolute inset-0 z-30 rounded-2xl ring-2 ring-[#fcd34d]/60 ring-offset-2 ring-offset-transparent"
          aria-hidden
        />
      )}
      <PieceMoveMenuOverlay />
    </div>
  );
}
