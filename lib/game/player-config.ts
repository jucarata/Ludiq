import type { PlayerColor } from "@/lib/board/types";
import { PLAYER_ORDER } from "@/lib/board/types";

export interface GameSetup {
  activePlayers: PlayerColor[];
  botPlayers: PlayerColor[];
}

export const MIN_PLAYERS = 2;
export const MAX_BOTS = 3;
export const MIN_HUMANS = 1;

/** Tutorial CTA: human red vs opponent blue. */
export const TUTORIAL_PRACTICE_SETUP: GameSetup = {
  activePlayers: ["red", "blue"],
  botPlayers: ["blue"],
};

export const TUTORIAL_PRACTICE_HREF =
  "/tuto?players=red,blue&bots=blue";

export function isBotPlayer(
  botPlayers: PlayerColor[],
  color: PlayerColor,
): boolean {
  return botPlayers.includes(color);
}

function isPlayerColor(value: string): value is PlayerColor {
  return (PLAYER_ORDER as readonly string[]).includes(value);
}

/** Parse `/tuto?players=red,blue&bots=blue` into a validated GameSetup. */
export function parseGameSetupFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): GameSetup | null {
  const playersRaw = params.get("players");
  if (!playersRaw) return null;

  const requestedPlayers = playersRaw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(isPlayerColor);
  const activePlayers = PLAYER_ORDER.filter((color) =>
    requestedPlayers.includes(color),
  );
  if (activePlayers.length < MIN_PLAYERS) return null;

  const botsRaw = params.get("bots") ?? "";
  const requestedBots = botsRaw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(isPlayerColor);
  const botPlayers = PLAYER_ORDER.filter(
    (color) =>
      requestedBots.includes(color) && activePlayers.includes(color),
  );

  if (botPlayers.length > MAX_BOTS) return null;
  if (activePlayers.length - botPlayers.length < MIN_HUMANS) return null;

  return { activePlayers, botPlayers };
}
