import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
} from "viem";
import { celo, celoSepolia } from "viem/chains";
import {
  CELO_MAINNET_USDT,
  CELO_SEPOLIA_USDT,
  getCompetitiveRpcUrl,
  isCeloSepoliaMode,
} from "@/lib/celo/constants";

export const CELO_TOKENS = {
  USDT: CELO_MAINNET_USDT,
  /** Minteo Colombian Peso (not Mento COPm). */
  COPM: {
    address: "0xC92E8Fc2947E32F2B574CCA9F2F12097A71d5606" as Address,
    symbol: "COPm",
    decimals: 18,
  },
} as const;

export { isCeloSepoliaMode };

export const CELO_ACTIVE_USDT = isCeloSepoliaMode()
  ? CELO_SEPOLIA_USDT
  : CELO_TOKENS.USDT;

export type CeloTokenSymbol = keyof typeof CELO_TOKENS;

export type TokenBalance = {
  symbol: string;
  formatted: string;
  raw: bigint;
};

const publicClient = createPublicClient({
  chain: isCeloSepoliaMode() ? celoSepolia : celo,
  transport: http(getCompetitiveRpcUrl()),
});

const BALANCE_TOKENS = isCeloSepoliaMode()
  ? ({ USDT: CELO_SEPOLIA_USDT } as const)
  : ({ USDT: CELO_TOKENS.USDT } as const);

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

  const tokenEntries = Object.entries(BALANCE_TOKENS) as [
    string,
    { address: Address; symbol: string; decimals: number },
  ][];

  const results = await Promise.all(
    tokenEntries.map(async ([, token]) => {
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
