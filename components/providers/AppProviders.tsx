"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { celo, celoSepolia } from "viem/chains";
import type { ReactNode } from "react";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function AppProviders({ children }: { children: ReactNode }) {
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "light",
          accentColor: "#2a9d8f",
          logo: undefined,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: celo,
        supportedChains: [celo, celoSepolia],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
