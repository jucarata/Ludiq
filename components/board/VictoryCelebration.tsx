"use client";

import { useEffect, useMemo } from "react";
import { useGameState } from "@/components/game/GameStateContext";
import { playFinishSound } from "@/lib/game/celebration";
import { PLAYER_COLORS } from "@/lib/board/types";

const STAR_COUNT = 12;
const GOLD = "#f1c40f";

interface StarSpec {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  scale: number;
  duration: number;
  delay: number;
  size: number;
  color: string;
}

/**
 * Ráfaga de estrellas (~2 s) sobre la casilla café cuando una ficha
 * llega a la meta. Se renderiza dentro de VictoryCell.
 */
export function VictoryCelebration() {
  const { celebration } = useGameState();

  useEffect(() => {
    if (celebration) playFinishSound();
  }, [celebration]);

  const stars = useMemo<StarSpec[]>(() => {
    if (!celebration) return [];

    const playerFill = PLAYER_COLORS[celebration.player].fill;

    return Array.from({ length: STAR_COUNT }, (_, i) => {
      const angle =
        (i / STAR_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const distance = 6 + Math.random() * 8;
      return {
        id: i,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        rot: -200 + Math.random() * 400,
        scale: 0.8 + Math.random(),
        duration: 1.2 + Math.random() * 0.7,
        delay: Math.random() * 0.2,
        size: 1.8 + Math.random() * 1.4,
        color: i % 2 === 0 ? GOLD : playerFill,
      };
    });
  }, [celebration]);

  if (!celebration) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
      aria-hidden
    >
      <span
        key={`flash-${celebration.key}`}
        className="victory-flash absolute left-1/2 top-1/2 h-full w-full rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,236,170,0.95) 0%, rgba(255,236,170,0) 70%)",
        }}
      />
      {stars.map((star) => (
        <span
          key={`${celebration.key}-${star.id}`}
          className="victory-star absolute left-1/2 top-1/2 leading-none"
          style={
            {
              color: star.color,
              fontSize: `${star.size}vmin`,
              textShadow: "0 0 6px rgba(255,220,120,0.8)",
              "--star-dx": `${star.dx}vmin`,
              "--star-dy": `${star.dy}vmin`,
              "--star-rot": `${star.rot}deg`,
              "--star-scale": star.scale,
              "--star-duration": `${star.duration}s`,
              "--star-delay": `${star.delay}s`,
            } as React.CSSProperties
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}
