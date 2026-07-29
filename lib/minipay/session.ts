import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeWalletAddress } from "@/lib/profile/types";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const MINIPAY_TOKEN_TYP = "minipay" as const;

type MiniPayTokenPayload = {
  typ: typeof MINIPAY_TOKEN_TYP;
  sub: string;
  wallet: string;
  exp: number;
};

function getSessionSecret(): string {
  const secret =
    process.env.MINIPAY_SESSION_SECRET || process.env.PRIVY_APP_SECRET;
  if (!secret) {
    throw new Error(
      "Missing MINIPAY_SESSION_SECRET or PRIVY_APP_SECRET for MiniPay sessions.",
    );
  }
  return secret;
}

function b64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function signBody(body: string): string {
  return b64url(createHmac("sha256", getSessionSecret()).update(body).digest());
}

export function issueMiniPaySessionToken(params: {
  userId: string;
  walletAddress: string;
}): string {
  const payload: MiniPayTokenPayload = {
    typ: MINIPAY_TOKEN_TYP,
    sub: params.userId,
    wallet: normalizeWalletAddress(params.walletAddress),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signBody(body)}`;
}

export function verifyMiniPaySessionToken(
  token: string,
): { userId: string; walletAddress: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  let expected: string;
  try {
    expected = signBody(body);
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      fromB64url(body).toString("utf8"),
    ) as MiniPayTokenPayload;
    if (payload.typ !== MINIPAY_TOKEN_TYP) return null;
    if (!payload.sub || !payload.wallet) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return {
      userId: payload.sub,
      walletAddress: normalizeWalletAddress(payload.wallet),
    };
  } catch {
    return null;
  }
}
