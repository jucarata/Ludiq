import { NextResponse } from "next/server";
import { isValidDiceRoll } from "@/lib/game/online-parse";
import { rollOnlineDice } from "@/lib/game/online-service";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { resolveRoomIdentity } from "@/lib/room/service";

type RollBody = {
  code?: string;
  roll?: [number, number];
  guestSessionId?: string;
  guestName?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as RollBody;
    const code = normalizeRoomCode(body.code ?? "");

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: "Invalid room code" },
        { status: 400 },
      );
    }

    if (body.roll != null && !isValidDiceRoll(body.roll)) {
      return NextResponse.json(
        { error: "Invalid dice roll" },
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

    const result = await rollOnlineDice({
      code,
      identity,
      roll: body.roll,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
