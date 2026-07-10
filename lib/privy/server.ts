import { PrivyClient } from "@privy-io/node";

let privyClient: PrivyClient | null = null;

export function getPrivyServerClient(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "Missing NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET. Add them to .env.local.",
    );
  }

  if (!privyClient) {
    privyClient = new PrivyClient({ appId, appSecret });
  }

  return privyClient;
}

export async function verifyPrivyAuthToken(accessToken: string) {
  const client = getPrivyServerClient();
  return client.utils().auth().verifyAccessToken(accessToken);
}
