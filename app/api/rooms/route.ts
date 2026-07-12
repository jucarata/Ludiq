import { NextResponse } from "next/server";
import { getOptionalPrivyUserId } from "@/lib/privy/request-auth";
import { parseRoomMode } from "@/lib/room/mode";
import {
  createRoomWithHost,
  getRoomByCode,
  resolveRoomIdentity,
} from "@/lib/room/service";

type CreateRoomBody = {
  mode?: string;
  guestSessionId?: string;
  guestName?: string;
};

export async function POST(request: Request) {
  try {
    const privyUserId = await getOptionalPrivyUserId(request);
    const body = (await request.json().catch(() => ({}))) as CreateRoomBody;
    const mode = parseRoomMode(body.mode);

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

    const room = await createRoomWithHost(identity, mode);
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 },
      );
    }

    const mode = parseRoomMode(searchParams.get("mode"));
    const privyUserId = await getOptionalPrivyUserId(request);
    const guestSessionId = searchParams.get("guestSessionId");

    const identity = await resolveRoomIdentity({
      privyUserId,
      guestSessionId,
      guestName: searchParams.get("guestName") ?? "GUEST",
    });

    const room = await getRoomByCode(code, identity, mode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
