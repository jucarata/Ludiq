"use client";

export type MiniPayEthereum = {
  isMiniPay?: boolean;
  request: (args: {
    method: string;
    params?: readonly unknown[];
  }) => Promise<unknown>;
};

/** True when the dApp is running inside the MiniPay WebView. */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const ethereum = (window as Window & { ethereum?: MiniPayEthereum }).ethereum;
  return ethereum?.isMiniPay === true;
}

export function getMiniPayEthereum(): MiniPayEthereum | null {
  if (!isMiniPay()) return null;
  return (window as Window & { ethereum?: MiniPayEthereum }).ethereum ?? null;
}
