"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { celo, celoSepolia } from "viem/chains";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function AppProviders({ children }: { children: ReactNode }) {
  const content = <LocaleProvider>{children}</LocaleProvider>;

  if (!appId) {
    return content;
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
      {content}
    </PrivyProvider>
  );
}
