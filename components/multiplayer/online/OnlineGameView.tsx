"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ParquesBoard } from "@/components/board/ParquesBoard";
import { BoardDiceZone } from "@/components/board/BoardDiceZone";
import { AutoModeProvider } from "@/components/game/AutoModeContext";
import { BotController } from "@/components/game/BotController";
import { DiceCursor } from "@/components/dice/DiceCursor";
import { PlayersProvider } from "@/components/game/PlayersContext";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { OnlineDiceProvider } from "@/components/multiplayer/online/OnlineDiceProvider";
import { OnlineGameStateProvider } from "@/components/multiplayer/online/OnlineGameStateProvider";
import { OnlineSessionProvider } from "@/components/multiplayer/online/OnlineSessionContext";
import { OnlineTurnProvider } from "@/components/multiplayer/online/OnlineTurnProvider";
import { TurnAnnouncement } from "@/components/turn/TurnAnnouncement";
import { TurnPanel } from "@/components/turn/TurnPanel";
import { WinnerAnnouncement } from "@/components/turn/WinnerAnnouncement";
import type { OnlineGameStateView } from "@/lib/game/online-types";
import { useGameRealtime } from "@/lib/game/use-game-realtime";
import { getGuestIdentity } from "@/lib/room/guest";
import { parseRoomMode } from "@/lib/room/mode";
import type { RoomView } from "@/lib/room/types";

export function OnlineGameView({ code }: { code: string }) {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseRoomMode(searchParams.get("mode"));
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [game, setGame] = useState<OnlineGameStateView | null>(null);
  const [loading, setLoading] = useState(true);

  const authHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authenticated) {
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [authenticated, getAccessToken]);

  const applyGame = useCallback((next: OnlineGameStateView) => {
    setGame((prev) => {
      if (prev && next.version < prev.version) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const headers = await authHeaders();
        const guest = getGuestIdentity();
        const params = new URLSearchParams({ code, mode });
        params.set("guestSessionId", guest.guestSessionId);
        params.set("guestName", guest.guestName);

        const res = await fetch(`/api/game?${params.toString()}`, { headers });
        if (!res.ok) {
          if (!cancelled) router.replace("/");
          return;
        }

        const data = (await res.json()) as {
          room: RoomView;
          game: OnlineGameStateView;
        };
        if (cancelled) return;

        const selfPlayer = data.room.players.find((player) => player.isSelf);
        if (!selfPlayer) {
          router.replace("/");
          return;
        }

        setRoom(data.room);
        setGame(data.game);
      } catch {
        if (!cancelled) router.replace("/");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authHeaders, code, mode, ready, router]);

  useGameRealtime({
    roomId: room?.id ?? null,
    onGame: applyGame,
  });

  const self = room?.players.find((player) => player.isSelf);

  const syncAutoEnabled = useCallback(
    (color: NonNullable<typeof self>["color"], enabled: boolean) => {
      if (!room || !self || color !== self.color) return;
      void (async () => {
        try {
          const headers = await authHeaders();
          const body: {
            code: string;
            mode: typeof mode;
            enabled: boolean;
            guestSessionId?: string;
            guestName?: string;
          } = { code: room.code, mode, enabled };

          if (self.isGuest) {
            const guest = getGuestIdentity();
            body.guestSessionId = guest.guestSessionId;
            body.guestName = self.username || guest.guestName;
          }

          const res = await fetch("/api/rooms/auto", {
            method: "PATCH",
            headers,
            body: JSON.stringify(body),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { room: RoomView };
          setRoom(data.room);
        } catch {
          /* Keep local toggle; next timeout uses last synced server value. */
        }
      })();
    },
    [authHeaders, mode, room, self],
  );

  if (!ready || loading || !room || !game || !self) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
        <p className="text-sm text-[var(--board-path-border)]">
          {t("room.loadingGame")}
        </p>
      </main>
    );
  }

  const backToMenu = () => {
    void (async () => {
      try {
        const headers = await authHeaders();
        const body: {
          code: string;
          mode: typeof mode;
          guestSessionId?: string;
          guestName?: string;
        } = { code: room.code, mode };

        if (self.isGuest) {
          const guest = getGuestIdentity();
          body.guestSessionId = guest.guestSessionId;
          body.guestName = self.username || guest.guestName;
        }

        await fetch("/api/rooms/leave", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      } catch {
        /* Still leave the play screen even if leave fails. */
      }
      router.replace("/");
    })();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OnlineSessionProvider
        code={code}
        mode={mode}
        room={room}
        game={game}
        selfColor={self.color}
        applyGame={applyGame}
        getAuthHeaders={authHeaders}
      >
        <PlayersProvider activePlayers={game.activePlayers} botPlayers={[]}>
          <AutoModeProvider
            canControlAuto={(color) => color === self.color}
            initialAutoByPlayer={{ [self.color]: self.autoEnabled }}
            onAutoEnabledChange={syncAutoEnabled}
          >
            <OnlineTurnProvider>
              <OnlineGameStateProvider>
                <OnlineDiceProvider>
                  <BotController />
                  <main className="flex min-h-0 flex-1 w-full max-w-full flex-col overflow-hidden py-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:py-4 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:items-center md:justify-center">
                    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col gap-2 md:w-auto md:flex-none md:flex-row md:items-stretch md:gap-4 md:[--board-size:min(calc(100dvw-2rem-var(--turn-panel-width)-1rem),calc(100dvh-2rem))] md:[--turn-panel-width:17rem]">
                      <div className="relative flex min-h-0 min-w-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden [container-type:size] md:w-auto md:flex-none md:shrink-0 md:overflow-visible md:[container-type:normal]">
                        <BoardDiceZone>
                          <ParquesBoard className="[--board-dim:min(100cqw,100cqh)] md:[--board-dim:var(--board-size)]" />
                          <TurnAnnouncement />
                          <WinnerAnnouncement onBackToMenu={backToMenu} />
                        </BoardDiceZone>
                      </div>
                      <TurnPanel />
                    </div>
                  </main>
                  <DiceCursor />
                </OnlineDiceProvider>
              </OnlineGameStateProvider>
            </OnlineTurnProvider>
          </AutoModeProvider>
        </PlayersProvider>
      </OnlineSessionProvider>
    </div>
  );
}
