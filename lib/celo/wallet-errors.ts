import { isCeloSepoliaMode } from "@/lib/celo/constants";
import { isMiniPay } from "@/lib/minipay/detect";

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
  const inMiniPay = typeof window !== "undefined" && isMiniPay();

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
    lower.includes("not enough usdt") ||
    lower.includes("insufficient usdt") ||
    lower.includes("transfer amount exceeds balance") ||
    lower.includes("erc20: transfer amount exceeds balance")
  ) {
    return inMiniPay
      ? "Not enough USDT for this payment and the network fee"
      : `Not enough USDT on ${network}`;
  }

  if (
    lower.includes("not enough celo") ||
    lower.includes("need celo for gas") ||
    lower.includes("need celo for network") ||
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("exceeds balance")
  ) {
    if (lower.includes("usdt") || inMiniPay) {
      return inMiniPay
        ? "Not enough USDT for this payment and the network fee"
        : `Not enough USDT on ${network}`;
    }
    return isCeloSepoliaMode()
      ? "Need CELO for gas on Celo Sepolia (USDT alone is not enough). Get free CELO at faucet.celo.org/celo-sepolia"
      : "Need CELO for network fees on Celo (USDT alone is not enough).";
  }

  if (
    lower.includes("partyescrow is not deployed") ||
    lower.includes("next_public_escrow_address") ||
    lower.includes("old competitive") ||
    (lower.includes("on-chain transaction reverted") &&
      lower.includes("party"))
  ) {
    return raw.length < 280
      ? raw
      : "Deploy PartyEscrow and set NEXT_PUBLIC_ESCROW_ADDRESS, then restart the app.";
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

  if (raw.length > 0 && raw.length < 280 && !lower.includes("internal")) {
    return raw;
  }

  return inMiniPay
    ? "Could not complete the transaction. Check your USDT balance and try again."
    : `Could not complete the transaction. Check network fees on ${network}.`;
}
