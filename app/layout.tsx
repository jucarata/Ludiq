import type { Metadata, Viewport } from "next";
import { HomePlayProvider } from "@/components/home/HomePlayContext";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ludiq — Parqués",
  description: "Multiplayer Parqués",
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
