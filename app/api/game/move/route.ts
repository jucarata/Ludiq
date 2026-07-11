import { NextResponse } from "next/server";
import { moveOnlinePiece } from "@/lib/game/online-service";
import type { PieceIndex } from "@/lib/game/pieces";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { resolveRoomIdentity } from "@/lib/room/service";

type MoveBody = {
  code?: string;
  pieceIndex?: number;
  dieValue?: number;
  guestSessionId?: string;
  guestName?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as MoveBody;
    const code = normalizeRoomCode(body.code ?? "");

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: "Invalid room code" },
        { status: 400 },
      );
    }

    if (
      typeof body.pieceIndex !== "number" ||
      body.pieceIndex < 0 ||
      body.pieceIndex > 3
    ) {
      return NextResponse.json(
        { error: "Invalid piece index" },
        { status: 400 },
      );
    }

    if (
      typeof body.dieValue !== "number" ||
      body.dieValue < 1 ||
      body.dieValue > 6
    ) {
      return NextResponse.json(
        { error: "Invalid die value" },
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

    const result = await moveOnlinePiece({
      code,
      identity,
      pieceIndex: body.pieceIndex as PieceIndex,
      dieValue: body.dieValue,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
