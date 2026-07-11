"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { PlayerColor } from "@/lib/board/types";
import type { OnlineGameStateView } from "@/lib/game/online-types";
import type { PieceIndex } from "@/lib/game/pieces";
import { getGuestIdentity } from "@/lib/room/guest";
import type { RoomView } from "@/lib/room/types";

type GuestBody = {
  guestSessionId?: string;
  guestName?: string;
};

type OnlineSessionContextValue = {
  code: string;
  room: RoomView;
  game: OnlineGameStateView;
  selfColor: PlayerColor;
  isMyTurn: boolean;
  applyGame: (game: OnlineGameStateView) => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  guestBody: () => GuestBody;
  postRoll: (roll: [number, number]) => Promise<{
    game: OnlineGameStateView;
    roll: [number, number];
  }>;
  postMove: (pieceIndex: PieceIndex, dieValue: number) => Promise<OnlineGameStateView>;
  postAdvanceTurn: () => Promise<OnlineGameStateView>;
};

const OnlineSessionContext = createContext<OnlineSessionContextValue | null>(
  null,
);

export function OnlineSessionProvider({
  code,
  room,
  game,
  selfColor,
  applyGame,
  getAuthHeaders,
  children,
}: {
  code: string;
  room: RoomView;
  game: OnlineGameStateView;
  selfColor: PlayerColor;
  applyGame: (game: OnlineGameStateView) => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  children: ReactNode;
}) {
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
    async (roll: [number, number]) => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/game/roll", {
        method: "POST",
        headers,
        body: JSON.stringify({ code, roll, ...guestBody() }),
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
    [applyGame, code, getAuthHeaders, guestBody],
  );

  const postMove = useCallback(
    async (pieceIndex: PieceIndex, dieValue: number) => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/game/move", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code,
          pieceIndex,
          dieValue,
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
    [applyGame, code, getAuthHeaders, guestBody],
  );

  const postAdvanceTurn = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/game/advance-turn", {
      method: "POST",
      headers,
      body: JSON.stringify({ code, ...guestBody() }),
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
  }, [applyGame, code, getAuthHeaders, guestBody]);

  const value = useMemo(
    () => ({
      code,
      room,
      game,
      selfColor,
      isMyTurn: game.currentTurn === selfColor && game.turnPhase !== "ended",
      applyGame,
      getAuthHeaders,
      guestBody,
      postRoll,
      postMove,
      postAdvanceTurn,
    }),
    [
      applyGame,
      code,
      game,
      getAuthHeaders,
      guestBody,
      postAdvanceTurn,
      postMove,
      postRoll,
      room,
      selfColor,
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
