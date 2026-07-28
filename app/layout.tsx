import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { brandBodyFont, brandTitleFont } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Partyk — La diversión nunca termina",
  description:
    "Partyk: la diversión nunca termina. Multijugador de Parqués con amigos.",
  applicationName: "Partyk",
  other: {
    "talentapp:project_verification":
      "1d06fe5220dc95354d1797642f38d117a7018d56385ec026402111ac420aa6649b05a157058efd41e043d178185a8896b746be2cf4d6e0622a1fe88cadc93eb9",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14174D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${brandBodyFont.variable} ${brandTitleFont.variable} ${brandBodyFont.className} flex min-h-dvh flex-col antialiased`}
      >
        <AppProviders>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
