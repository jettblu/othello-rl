import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import CrtToaster from "@/components/crtToaster";
import Fathom from "@/components/metrics/Fathom";
import Providers from "@/components/providers";
import { PALETTE, PALETTE_CSS_VARS } from "@/constants/palette";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Othello",
  description:
    "Play Othello online against a friend or a computer. The AI is powered by reinforcement learning trained with self-play and probabilitic search.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: PALETTE.ink,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-dvh overflow-hidden ${plexMono.variable}`}
      style={PALETTE_CSS_VARS as CSSProperties}
    >
      <body
        className={`${plexMono.className} h-full bg-crt-bg text-crt-dim overflow-hidden px-3 sm:px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
      >
        <CrtToaster />
        <Providers>{children}</Providers>
        <Fathom />
      </body>
    </html>
  );
}
