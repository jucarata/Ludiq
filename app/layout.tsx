import type { Metadata, Viewport } from "next";
import { HomePlayProvider } from "@/components/home/HomePlayContext";
import { AppFooter } from "@/components/nav/AppFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ludiq — Parqués",
  description: "Parqués multijugador",
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
    <html lang="es">
      <body className="flex min-h-dvh flex-col antialiased">
        <HomePlayProvider>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <AppFooter />
        </HomePlayProvider>
      </body>
    </html>
  );
}
