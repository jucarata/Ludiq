import { NextResponse } from "next/server";
import type { PlayerColor } from "@/lib/board/types";
import { PLAYER_ORDER } from "@/lib/board/types";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { changePlayerColor, resolveRoomIdentity } from "@/lib/room/service";

type ColorBody = {
  code?: string;
  color?: PlayerColor;
  guestSessionId?: string;
  guestName?: string;
};

function isPlayerColor(value: unknown): value is PlayerColor {
  return (
    typeof value === "string" &&
    (PLAYER_ORDER as readonly string[]).includes(value)
  );
}

export async function PATCH(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as ColorBody;

    if (!body.code?.trim()) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 },
      );
    }

    if (!isPlayerColor(body.color)) {
      return NextResponse.json(
        { error: "Invalid piece color" },
        { status: 400 },
      );
    }

    const identity = await resolveRoomIdentity({
      privyUserId,
      guestSessionId: body.guestSessionId,
      guestName: body.guestName,
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Guest session is required" },
        { status: 400 },
      );
    }

    const room = await changePlayerColor({
      code: body.code,
      color: body.color,
      identity,
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
