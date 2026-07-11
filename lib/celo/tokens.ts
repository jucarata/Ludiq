import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
} from "viem";
import { celo } from "viem/chains";

export const CELO_TOKENS = {
  USDT: {
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as Address,
    symbol: "USDT",
    decimals: 6,
  },
  /** Minteo Colombian Peso (not Mento COPm). */
  COPM: {
    address: "0xC92E8Fc2947E32F2B574CCA9F2F12097A71d5606" as Address,
    symbol: "COPm",
    decimals: 18,
  },
} as const;

export type CeloTokenSymbol = keyof typeof CELO_TOKENS;

export type TokenBalance = {
  symbol: string;
  formatted: string;
  raw: bigint;
};

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

function formatTokenAmount(value: bigint, decimals: number): string {
  const asNumber = Number(formatUnits(value, decimals));
  if (!Number.isFinite(asNumber)) {
    return formatUnits(value, decimals);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, 4),
  }).format(asNumber);
}

export async function fetchCeloTokenBalances(
  walletAddress: string,
): Promise<TokenBalance[]> {
  const owner = walletAddress as Address;

  const results = await Promise.all(
    (Object.keys(CELO_TOKENS) as CeloTokenSymbol[]).map(async (key) => {
      const token = CELO_TOKENS[key];
      const raw = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
      });

      return {
        symbol: token.symbol,
        raw,
        formatted: formatTokenAmount(raw, token.decimals),
      } satisfies TokenBalance;
    }),
  );

  return results;
}
