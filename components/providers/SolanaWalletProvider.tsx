"use client";

import "@solana/wallet-adapter-react-ui/styles.css";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { SOLANA_RPC_ENDPOINT } from "@/lib/solana";

export function SolanaWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
      <WalletProvider autoConnect wallets={wallets}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
