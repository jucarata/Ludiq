import { NextResponse } from "next/server";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { parseRoomMode } from "@/lib/room/mode";
import { resolveRoomIdentity, setPlayerAutoEnabled } from "@/lib/room/service";

type AutoBody = {
  code?: string;
  mode?: string;
  enabled?: boolean;
  guestSessionId?: string;
  guestName?: string;
};

export async function PATCH(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json()) as AutoBody;
    const mode = parseRoomMode(body.mode);

    if (!body.code?.trim()) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 },
      );
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
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

    const room = await setPlayerAutoEnabled({
      code: body.code,
      identity,
      mode,
      enabled: body.enabled,
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
