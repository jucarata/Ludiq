"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { celo, celoSepolia } from "viem/chains";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { MiniPayAuthProvider } from "@/components/providers/MiniPayAuthProvider";
import { AppAuthProvider } from "@/lib/auth/useAppAuth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function AppProviders({ children }: { children: ReactNode }) {
  const content = (
    <MiniPayAuthProvider>
      <AppAuthProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </AppAuthProvider>
    </MiniPayAuthProvider>
  );

  if (!appId) {
    return content;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Wallet auth uses headless SIWE in ConnectWalletModal (avoids Privy
        // ConnectWalletView duplicate-key bug). Email still uses Privy UI.
        // Inside MiniPay we never call Privy login — see MiniPayAuthProvider.
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#6A3DF3",
          logo: undefined,
          walletChainType: "ethereum-only",
        },
        embeddedWallets: {
          ethereum: {
            // Only for email signup. Wallet login uses the user's own wallet.
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain:
          process.env.NEXT_PUBLIC_CELO_CHAIN?.toLowerCase() === "sepolia" ||
          process.env.NEXT_PUBLIC_CELO_CHAIN?.toLowerCase() === "celo-sepolia"
            ? celoSepolia
            : celo,
        supportedChains: [celo, celoSepolia],
      }}
    >
      {content}
    </PrivyProvider>
  );
}
