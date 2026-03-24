"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { shortenAddress } from "@/lib/solana";

export function WalletButton() {
  const { connected, connecting, disconnecting, disconnect, publicKey } =
    useWallet();
  const { setVisible } = useWalletModal();

  if (!connected || !publicKey) {
    return (
      <button
        className="font-label inline-flex items-center justify-center rounded-2xl border border-cyan-200/20 bg-[linear-gradient(180deg,rgba(143,245,255,0.14),rgba(143,245,255,0.06))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-200/35 hover:bg-cyan-200/[0.12]"
        onClick={() => setVisible(true)}
        type="button"
      >
        {connecting ? "Connecting..." : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
        onClick={() => setVisible(true)}
        type="button"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
        {shortenAddress(publicKey)}
      </button>

      <button
        className="font-label rounded-2xl border border-white/10 px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] transition hover:bg-white/[0.04] hover:text-white"
        onClick={() => void disconnect()}
        type="button"
      >
        {disconnecting ? "..." : "Exit"}
      </button>
    </div>
  );
}
