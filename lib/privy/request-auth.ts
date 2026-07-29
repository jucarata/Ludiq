import { verifyMiniPaySessionToken } from "@/lib/minipay/session";
import { verifyPrivyAuthToken } from "@/lib/privy/server";

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Resolves the app user id from either a Privy access token or a MiniPay
 * session token. MiniPay tokens use `minipay:0x…` (or an existing profile's
 * privy_user_id when the wallet was already linked).
 */
export async function getOptionalPrivyUserId(
  request: Request,
): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const miniPay = verifyMiniPaySessionToken(token);
  if (miniPay) return miniPay.userId;

  try {
    const claims = await verifyPrivyAuthToken(token);
    return claims.user_id;
  } catch {
    return null;
  }
}

export async function requirePrivyUserId(request: Request): Promise<string> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const miniPay = verifyMiniPaySessionToken(token);
  if (miniPay) return miniPay.userId;

  try {
    const claims = await verifyPrivyAuthToken(token);
    return claims.user_id;
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
