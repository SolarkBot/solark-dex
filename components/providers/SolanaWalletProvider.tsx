"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { SOLANA_RPC_ENDPOINT } from "@/lib/solana";

export function SolanaWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
      <WalletProvider wallets={wallets}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
