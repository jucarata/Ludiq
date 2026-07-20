"use client";

import { useEffect, useState } from "react";
import { DieFace } from "@/components/dice/DieFace";
import { retroActionFont } from "@/lib/fonts";

const FACES = [1, 2, 3, 4, 5, 6] as const;

type DiceWaitScreenProps = {
  title: string;
  hint?: string;
  /** When true, covers the parent as an absolute overlay instead of a full page. */
  overlay?: boolean;
};

/**
 * Shared entertaining wait state (bouncing dice) for lobby / deposit / start / load.
 */
export function DiceWaitScreen({
  title,
  hint,
  overlay = false,
}: DiceWaitScreenProps) {
  const [left, setLeft] = useState(5);
  const [right, setRight] = useState(2);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft(FACES[Math.floor(Math.random() * FACES.length)]!);
      setRight(FACES[Math.floor(Math.random() * FACES.length)]!);
    }, 420);
    return () => window.clearInterval(id);
  }, []);

  const content = (
    <>
      <div className="relative flex items-end justify-center gap-4 sm:gap-5">
        <div className="deposit-die deposit-die--a">
          <DieFace
            value={left}
            className="h-16 w-16 drop-shadow-md sm:h-20 sm:w-20"
          />
        </div>
        <div className="deposit-die deposit-die--b">
          <DieFace
            value={right}
            className="h-16 w-16 drop-shadow-md sm:h-20 sm:w-20"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p
          className={`${retroActionFont.className} text-sm tracking-wide text-[var(--board-path)] sm:text-base`}
        >
          {title}
        </p>
        {hint ? (
          <p className="max-w-xs text-xs text-[var(--board-path-border)]">
            {hint}
          </p>
        ) : null}
      </div>
    </>
  );

  if (overlay) {
    return (
      <div
        className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[#1a1a2e]/92 px-6 backdrop-blur-[2px]"
        aria-busy
        aria-live="polite"
        role="status"
      >
        {content}
      </div>
    );
  }

  return (
    <main
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-8"
      aria-busy
      aria-live="polite"
      role="status"
    >
      {content}
    </main>
  );
}
