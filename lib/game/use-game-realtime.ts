"use client";

import { useEffect, useRef } from "react";
import {
  toOnlineGameStateView,
  type GameStateRowLike,
} from "@/lib/game/online-parse";
import type { OnlineGameStateView } from "@/lib/game/online-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type UseGameRealtimeOptions = {
  roomId: string | null;
  onGame: (game: OnlineGameStateView) => void;
  onFinished?: () => void;
};

type RoomStatusPayload = {
  status?: "waiting" | "playing" | "finished";
};

function isGameStateRowLike(value: unknown): value is GameStateRowLike {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.room_id === "string" &&
    typeof row.version === "number" &&
    typeof row.turn_started_at === "string" &&
    typeof row.updated_at === "string"
  );
}

export function useGameRealtime({
  roomId,
  onGame,
  onFinished,
}: UseGameRealtimeOptions) {
  const onGameRef = useRef(onGame);
  const onFinishedRef = useRef(onFinished);

  onGameRef.current = onGame;
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (!roomId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`game-state:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_states",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new;
          if (!isGameStateRowLike(row)) return;
          const game = toOnlineGameStateView(row);
          onGameRef.current(game);
          if (game.turnPhase === "ended" || game.winner) {
            onFinishedRef.current?.();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const status = (payload.new as RoomStatusPayload | null)?.status;
          if (status === "finished") {
            onFinishedRef.current?.();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);
}
