"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PlayerColor } from "@/lib/board/types";
import type { PieceIndex } from "@/lib/game/pieces";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type LiveRollPayload = {
  kind: "roll";
  color: PlayerColor;
  roll: [number, number];
  ts: number;
};

export type LiveMovePayload = {
  kind: "move";
  color: PlayerColor;
  pieceIndex: PieceIndex;
  dieValue: number;
  fromRouteIndex: number;
  ts: number;
};

export type LiveActionPayload = LiveRollPayload | LiveMovePayload;

const LIVE_EVENT = "action";

function isLiveActionPayload(value: unknown): value is LiveActionPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (row.kind === "roll") {
    return (
      typeof row.color === "string" &&
      Array.isArray(row.roll) &&
      row.roll.length === 2 &&
      typeof row.roll[0] === "number" &&
      typeof row.roll[1] === "number"
    );
  }
  if (row.kind === "move") {
    return (
      typeof row.color === "string" &&
      typeof row.pieceIndex === "number" &&
      typeof row.dieValue === "number" &&
      typeof row.fromRouteIndex === "number"
    );
  }
  return false;
}

type UseGameLiveChannelOptions = {
  roomId: string | null;
  selfColor: PlayerColor;
  onRemoteRoll: (payload: LiveRollPayload) => void;
  onRemoteMove: (payload: LiveMovePayload) => void;
};

/**
 * Ephemeral Realtime Broadcast for near-instant roll/move UX.
 * DB postgres_changes remains the source of truth for reconnection.
 */
export function useGameLiveChannel({
  roomId,
  selfColor,
  onRemoteRoll,
  onRemoteMove,
}: UseGameLiveChannelOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const selfColorRef = useRef(selfColor);
  const onRemoteRollRef = useRef(onRemoteRoll);
  const onRemoteMoveRef = useRef(onRemoteMove);

  selfColorRef.current = selfColor;
  onRemoteRollRef.current = onRemoteRoll;
  onRemoteMoveRef.current = onRemoteMove;

  useEffect(() => {
    if (!roomId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`game-live:${roomId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel.on("broadcast", { event: LIVE_EVENT }, ({ payload }) => {
      if (!isLiveActionPayload(payload)) return;
      if (payload.color === selfColorRef.current) return;

      if (payload.kind === "roll") {
        onRemoteRollRef.current(payload);
        return;
      }
      onRemoteMoveRef.current(payload);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendLiveRoll = useCallback(
    (roll: [number, number], color: PlayerColor = selfColorRef.current) => {
      const channel = channelRef.current;
      if (!channel) return;
      const payload: LiveRollPayload = {
        kind: "roll",
        color,
        roll,
        ts: Date.now(),
      };
      void channel.send({
        type: "broadcast",
        event: LIVE_EVENT,
        payload,
      });
    },
    [],
  );

  const sendLiveMove = useCallback(
    (params: {
      pieceIndex: PieceIndex;
      dieValue: number;
      fromRouteIndex: number;
      color?: PlayerColor;
    }) => {
      const channel = channelRef.current;
      if (!channel) return;
      const payload: LiveMovePayload = {
        kind: "move",
        color: params.color ?? selfColorRef.current,
        pieceIndex: params.pieceIndex,
        dieValue: params.dieValue,
        fromRouteIndex: params.fromRouteIndex,
        ts: Date.now(),
      };
      void channel.send({
        type: "broadcast",
        event: LIVE_EVENT,
        payload,
      });
    },
    [],
  );

  return { sendLiveRoll, sendLiveMove };
}
