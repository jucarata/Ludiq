import type { Metadata, Viewport } from "next";
import { HomePlayProvider } from "@/components/home/HomePlayContext";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ludiq — Parqués",
  description: "Multiplayer Parqués",
  other: {
    "talentapp:project_verification":
      "1d06fe5220dc95354d1797642f38d117a7018d56385ec026402111ac420aa6649b05a157058efd41e043d178185a8896b746be2cf4d6e0622a1fe88cadc93eb9",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <AppProviders>
          <HomePlayProvider>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </HomePlayProvider>
        </AppProviders>
      </body>
    </html>
  );
}
