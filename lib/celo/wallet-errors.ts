/** Maps wallet / on-chain failures to a short user-facing message. */
export function formatCompetitiveTxError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Transaction failed";

  const lower = raw.toLowerCase();

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
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("exceeds balance")
  ) {
    return "Not enough CELO for gas on Celo Sepolia";
  }

  if (
    lower.includes("transfer amount exceeds balance") ||
    lower.includes("erc20: transfer amount exceeds balance") ||
    lower.includes("insufficient usdc")
  ) {
    return "Not enough USDC on Celo Sepolia (need 0.20)";
  }

  if (
    lower.includes("next_public_escrow_address") ||
    lower.includes("escrow address")
  ) {
    return "Escrow contract is not configured. Restart the app after updating .env.local";
  }

  if (lower.includes("chain") && lower.includes("switch")) {
    return "Could not switch wallet to Celo Sepolia";
  }

  // Keep short technical hints when useful (Privy / viem often include them).
  if (raw.length > 0 && raw.length < 160 && !lower.includes("internal")) {
    return raw;
  }

  return "Could not deposit entry fee. Check USDC and gas on Celo Sepolia.";
}
