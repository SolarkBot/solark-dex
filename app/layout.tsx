import type { Metadata } from "next";
import {
  Chakra_Petch,
  Familjen_Grotesk,
  IBM_Plex_Mono,
} from "next/font/google";
import type { ReactNode } from "react";
import { SolanaWalletProvider } from "@/components/providers/SolanaWalletProvider";
import "./globals.css";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const body = Familjen_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const label = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-label",
});

export const metadata: Metadata = {
  title: "Solark DEX",
  description:
    "A cinematic Solana swap experience served from SolarkBot's dedicated /dex entrypoint.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${label.variable} bg-[var(--bg)] text-[var(--text)] antialiased`}
      >
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
