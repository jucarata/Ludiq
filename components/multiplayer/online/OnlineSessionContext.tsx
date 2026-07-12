"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { PlayerColor } from "@/lib/board/types";
import type { OnlineGameStateView } from "@/lib/game/online-types";
import type { PieceIndex } from "@/lib/game/pieces";
import {
  useGameLiveChannel,
  type LiveMovePayload,
  type LiveRollPayload,
} from "@/lib/game/use-game-live-channel";
import { getGuestIdentity } from "@/lib/room/guest";
import type { RoomMode } from "@/lib/room/mode";
import type { RoomView } from "@/lib/room/types";

type GuestBody = {
  guestSessionId?: string;
  guestName?: string;
};

type OnlineSessionContextValue = {
  code: string;
  mode: RoomMode;
  room: RoomView;
  game: OnlineGameStateView;
  selfColor: PlayerColor;
  isMyTurn: boolean;
  /** True while an own move POST is in flight — blocks timeout advance. */
  turnAdvanceBlockedRef: { current: boolean };
  applyGame: (game: OnlineGameStateView) => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  guestBody: () => GuestBody;
  postRoll: (
    roll: [number, number],
    actionId: string,
  ) => Promise<{
    game: OnlineGameStateView;
    roll: [number, number];
  }>;
  postMove: (
    pieceIndex: PieceIndex,
    dieValue: number,
    actionId: string,
  ) => Promise<OnlineGameStateView>;
  postAdvanceTurn: (options?: {
    autoEnabled?: boolean;
  }) => Promise<OnlineGameStateView>;
  sendLiveRoll: (params: {
    roll: [number, number];
    actionId: string;
    basedOnVersion: number;
  }) => void;
  sendLiveMove: (params: {
    pieceIndex: PieceIndex;
    dieValue: number;
    fromRouteIndex: number;
    actionId: string;
    basedOnVersion: number;
  }) => void;
  subscribeLiveRoll: (handler: (payload: LiveRollPayload) => void) => () => void;
  subscribeLiveMove: (handler: (payload: LiveMovePayload) => void) => () => void;
};

const OnlineSessionContext = createContext<OnlineSessionContextValue | null>(
  null,
);

export function OnlineSessionProvider({
  code,
  mode,
  room,
  game,
  selfColor,
  applyGame,
  getAuthHeaders,
  children,
}: {
  code: string;
  mode: RoomMode;
  room: RoomView;
  game: OnlineGameStateView;
  selfColor: PlayerColor;
  applyGame: (game: OnlineGameStateView) => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  children: ReactNode;
}) {
  const turnAdvanceBlockedRef = useRef(false);
  const rollHandlersRef = useRef(
    new Set<(payload: LiveRollPayload) => void>(),
  );
  const moveHandlersRef = useRef(
    new Set<(payload: LiveMovePayload) => void>(),
  );

  const onRemoteRoll = useCallback((payload: LiveRollPayload) => {
    for (const handler of rollHandlersRef.current) {
      handler(payload);
    }
  }, []);

  const onRemoteMove = useCallback((payload: LiveMovePayload) => {
    for (const handler of moveHandlersRef.current) {
      handler(payload);
    }
  }, []);

  const { sendLiveRoll, sendLiveMove } = useGameLiveChannel({
    roomId: room.id,
    selfColor,
    onRemoteRoll,
    onRemoteMove,
  });

  const subscribeLiveRoll = useCallback(
    (handler: (payload: LiveRollPayload) => void) => {
      rollHandlersRef.current.add(handler);
      return () => {
        rollHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const subscribeLiveMove = useCallback(
    (handler: (payload: LiveMovePayload) => void) => {
      moveHandlersRef.current.add(handler);
      return () => {
        moveHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const guestBody = useCallback((): GuestBody => {
    const self = room.players.find((player) => player.isSelf);
    if (!self?.isGuest) return {};
    const guest = getGuestIdentity();
    return {
      guestSessionId: guest.guestSessionId,
      guestName: self.username || guest.guestName,
    };
  }, [room.players]);

  const postRoll = useCallback(
    async (roll: [number, number], actionId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/game/roll", {
        method: "POST",
        headers,
        body: JSON.stringify({ code, mode, roll, actionId, ...guestBody() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Roll failed");
      }
      const data = (await res.json()) as {
        game: OnlineGameStateView;
        roll: [number, number];
      };
      applyGame(data.game);
      return data;
    },
    [applyGame, code, getAuthHeaders, guestBody, mode],
  );

  const postMove = useCallback(
    async (pieceIndex: PieceIndex, dieValue: number, actionId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/game/move", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code,
          mode,
          pieceIndex,
          dieValue,
          actionId,
          ...guestBody(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Move failed");
      }
      const data = (await res.json()) as { game: OnlineGameStateView };
      applyGame(data.game);
      return data.game;
    },
    [applyGame, code, getAuthHeaders, guestBody, mode],
  );

  const postAdvanceTurn = useCallback(
    async (options?: { autoEnabled?: boolean }) => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/game/advance-turn", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code,
          mode,
          autoEnabled: options?.autoEnabled === true,
          ...guestBody(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Advance failed");
      }
      const data = (await res.json()) as { game: OnlineGameStateView };
      applyGame(data.game);
      return data.game;
    },
    [applyGame, code, getAuthHeaders, guestBody, mode],
  );

  const value = useMemo(
    () => ({
      code,
      mode,
      room,
      game,
      selfColor,
      isMyTurn: game.currentTurn === selfColor && game.turnPhase !== "ended",
      turnAdvanceBlockedRef,
      applyGame,
      getAuthHeaders,
      guestBody,
      postRoll,
      postMove,
      postAdvanceTurn,
      sendLiveRoll,
      sendLiveMove,
      subscribeLiveRoll,
      subscribeLiveMove,
    }),
    [
      applyGame,
      code,
      game,
      getAuthHeaders,
      guestBody,
      mode,
      postAdvanceTurn,
      postMove,
      postRoll,
      room,
      selfColor,
      sendLiveMove,
      sendLiveRoll,
      subscribeLiveMove,
      subscribeLiveRoll,
    ],
  );

  return (
    <OnlineSessionContext.Provider value={value}>
      {children}
    </OnlineSessionContext.Provider>
  );
}

export function useOnlineSession() {
  const value = useContext(OnlineSessionContext);
  if (!value) {
    throw new Error("useOnlineSession must be used within OnlineSessionProvider");
  }
  return value;
}

export function useOptionalOnlineSession() {
  return useContext(OnlineSessionContext);
}
