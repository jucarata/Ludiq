import { NextResponse } from "next/server";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room/code";
import { parseRoomMode } from "@/lib/room/mode";
import {
  confirmCompetitiveEntry,
  resolveRoomIdentity,
} from "@/lib/room/service";

type ConfirmBody = {
  code?: string;
  mode?: string;
  entryTxHash?: string;
  guestSessionId?: string;
  guestName?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as ConfirmBody;
    const code = normalizeRoomCode(body.code ?? "");
    const mode = parseRoomMode(body.mode);
    const entryTxHash = body.entryTxHash?.trim();

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: "Invalid room code" },
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
        { error: "Authentication is required" },
        { status: 401 },
      );
    }

    const room = await confirmCompetitiveEntry({
      code,
      identity,
      mode,
      entryTxHash,
    });
    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
