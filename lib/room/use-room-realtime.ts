"use client";

import { useCallback, useEffect, useRef } from "react";
import { getGuestIdentity } from "@/lib/room/guest";
import type { RoomMode } from "@/lib/room/mode";
import { DEFAULT_ROOM_MODE } from "@/lib/room/mode";
import type { RoomView } from "@/lib/room/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type UseRoomRealtimeOptions = {
  room: RoomView | null;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onRoom: (room: RoomView) => void;
  onClosed?: () => void;
  onKicked?: () => void;
  onGameStarted?: (room: RoomView) => void;
};

type RoomStatusPayload = {
  status?: RoomView["status"];
};

export function useRoomRealtime({
  room,
  getAuthHeaders,
  onRoom,
  onClosed,
  onKicked,
  onGameStarted,
}: UseRoomRealtimeOptions) {
  const getAuthHeadersRef = useRef(getAuthHeaders);
  const onRoomRef = useRef(onRoom);
  const onClosedRef = useRef(onClosed);
  const onKickedRef = useRef(onKicked);
  const onGameStartedRef = useRef(onGameStarted);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);
  const kickedRef = useRef(false);
  const startedRef = useRef(false);

  getAuthHeadersRef.current = getAuthHeaders;
  onRoomRef.current = onRoom;
  onClosedRef.current = onClosed;
  onKickedRef.current = onKicked;
  onGameStartedRef.current = onGameStarted;

  const emitClosed = useCallback(() => {
    if (closedRef.current || kickedRef.current || startedRef.current) return;
    closedRef.current = true;
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = null;
    onClosedRef.current?.();
  }, []);

  const emitKicked = useCallback(() => {
    if (closedRef.current || kickedRef.current || startedRef.current) return;
    kickedRef.current = true;
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = null;
    onKickedRef.current?.();
  }, []);

  const emitStarted = useCallback((next: RoomView) => {
    if (closedRef.current || kickedRef.current || startedRef.current) return;
    startedRef.current = true;
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = null;
    onGameStartedRef.current?.(next);
  }, []);

  const refreshRoom = useCallback(
    async (code: string, mode: RoomMode = DEFAULT_ROOM_MODE) => {
      const headers = await getAuthHeadersRef.current();
      const guest = getGuestIdentity();
      const params = new URLSearchParams({ code, mode });
      params.set("guestSessionId", guest.guestSessionId);
      params.set("guestName", guest.guestName);

      const res = await fetch(`/api/rooms?${params.toString()}`, { headers });
      if (!res.ok) return null;

      const data = (await res.json()) as { room: RoomView };
      return data.room;
    },
    [],
  );

  const scheduleRefresh = useCallback(
    (code: string, mode: RoomMode) => {
      if (closedRef.current || kickedRef.current || startedRef.current) return;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        void (async () => {
          if (closedRef.current || kickedRef.current || startedRef.current) {
            return;
          }
          const next = await refreshRoom(code, mode);
          if (closedRef.current || kickedRef.current || startedRef.current) {
            return;
          }

          if (!next || next.status === "finished") {
            emitClosed();
            return;
          }

          if (next.status === "playing") {
            emitStarted(next);
            return;
          }

          if (!next.players.some((player) => player.isSelf)) {
            emitKicked();
            return;
          }

          onRoomRef.current(next);
        })();
      }, 80);
    },
    [emitClosed, emitKicked, emitStarted, refreshRoom],
  );

  useEffect(() => {
    closedRef.current = false;
    kickedRef.current = false;
    startedRef.current = false;
    if (!room?.id || room.status !== "waiting") return;

    const mode = room.mode ?? DEFAULT_ROOM_MODE;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`room-lobby:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_room_players",
          filter: `room_id=eq.${room.id}`,
        },
        () => scheduleRefresh(room.code, mode),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const nextStatus = (payload.new as RoomStatusPayload | null)?.status;
          if (nextStatus === "finished") {
            emitClosed();
            return;
          }
          if (nextStatus === "playing") {
            scheduleRefresh(room.code, mode);
            return;
          }
          scheduleRefresh(room.code, mode);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [room?.id, room?.code, room?.mode, room?.status, scheduleRefresh, emitClosed]);
}
