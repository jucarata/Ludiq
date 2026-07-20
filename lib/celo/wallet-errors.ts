import { isCeloSepoliaMode } from "@/lib/celo/constants";

/** Maps wallet / on-chain failures to a short user-facing message. */
export function formatCompetitiveTxError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Transaction failed";

  const lower = raw.toLowerCase();
  const network = isCeloSepoliaMode() ? "Celo Sepolia" : "Celo";

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("denied transaction")
  ) {
    return "Transaction rejected in wallet";
  }

  if (lower.includes("does not match your profile wallet")) {
    return raw;
  }

  if (
    lower.includes("not enough celo") ||
    lower.includes("need celo for gas") ||
    lower.includes("need celo for network") ||
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("exceeds balance")
  ) {
    if (lower.includes("usdt")) {
      return `Not enough USDT on ${network} (need 0.20)`;
    }
    return isCeloSepoliaMode()
      ? "Need CELO for gas on Celo Sepolia (USDT alone is not enough). Get free CELO at faucet.celo.org/celo-sepolia"
      : "Need CELO for network fees on Celo (USDT alone is not enough).";
  }

  if (
    lower.includes("transfer amount exceeds balance") ||
    lower.includes("erc20: transfer amount exceeds balance") ||
    lower.includes("insufficient usdt")
  ) {
    return `Not enough USDT on ${network} (need 0.20)`;
  }

  if (
    lower.includes("next_public_escrow_address") ||
    lower.includes("escrow address")
  ) {
    return "Escrow contract is not configured. Restart the app after updating .env.local";
  }

  if (lower.includes("chain") && lower.includes("switch")) {
    return `Could not switch wallet to ${network}`;
  }

  if (
    lower.includes("alreadypaid") ||
    lower.includes("already paid") ||
    lower.includes("0x0d70a0e3")
  ) {
    return "Entry fee already paid on-chain. Tap Confirm again to sync the lobby.";
  }

  if (raw.length > 0 && raw.length < 160 && !lower.includes("internal")) {
    return raw;
  }

  return `Could not deposit entry fee. Check USDT and network fees on ${network}.`;
}
