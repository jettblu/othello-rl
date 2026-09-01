import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Fathom from "@/components/metrics/Fathom";
import Providers from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Othello",
  description:
    "Play Othello online against a friend or a computer. The AI is powered by reinforcement learning trained with self-play and probabilitic search.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gray-300 overflow-x-hidden px-3 sm:px-4 pb-[max(1rem,env(safe-area-inset-bottom))]`}
      >
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              border: "1px solid #713200",
              padding: "12px 16px",
              color: "#713200",
              maxWidth: "calc(100vw - 1.5rem)",
            },
          }}
          containerStyle={{
            bottom: 16,
            insetInline: 12,
          }}
        />
        <Providers>{children}</Providers>
        <Fathom />
      </body>
    </html>
  );
}
