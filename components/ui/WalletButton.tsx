"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWalletMultiButton } from "@solana/wallet-adapter-base-ui";
import { useEffect, useMemo, useState } from "react";
import { shortenAddress } from "@/lib/solana";

function getWalletStateLabel(state: WalletReadyState) {
  switch (state) {
    case WalletReadyState.Installed:
      return "Installed";
    case WalletReadyState.Loadable:
      return "Loadable";
    case WalletReadyState.NotDetected:
      return "Not detected";
    default:
      return "Unavailable";
  }
}

export function WalletButton() {
  const [panel, setPanel] = useState<"disconnect" | "picker" | null>(null);
  const [phantomReadyState, setPhantomReadyState] = useState<WalletReadyState>(
    WalletReadyState.Unsupported,
  );
  const [phantomIcon, setPhantomIcon] = useState<string | null>(null);
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null);
  const [selectWallet, setSelectWallet] = useState<((walletName: string) => void) | null>(null);
  const {
    buttonState,
    onConnect,
    onDisconnect,
    onSelectWallet,
    publicKey,
    walletName,
  } = useWalletMultiButton({
    onSelectWallet: ({ onSelectWallet: nextSelectWallet, wallets }) => {
      const phantomWallet =
        wallets.find((entry) => entry.adapter.name === "Phantom") ?? null;

      setPhantomReadyState(phantomWallet?.readyState ?? WalletReadyState.Unsupported);
      setPhantomIcon(phantomWallet?.adapter.icon ?? null);
      setSelectWallet(() => nextSelectWallet);
      setPanel("picker");
    },
  });
  const connected = buttonState === "connected";
  const connecting = buttonState === "connecting";
  const hasWallet = buttonState === "has-wallet";
  const phantomUnavailable = useMemo(
    () => phantomReadyState === WalletReadyState.Unsupported,
    [phantomReadyState],
  );

  useEffect(() => {
    if (connected || connecting) {
      setPanel(null);
    }
  }, [connected, connecting]);

  useEffect(() => {
    if (!pendingWalletName || !hasWallet || !onConnect || walletName !== pendingWalletName) {
      return;
    }

    onConnect();
    setPendingWalletName(null);
  }, [hasWallet, onConnect, pendingWalletName, walletName]);

  return (
    <div className="relative">
      <button
        className="hud-panel inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--line-strong)] hover:bg-white/[0.06]"
        onClick={() => {
          if (connected) {
            setPanel((current) => (current === "disconnect" ? null : "disconnect"));
            return;
          }

          if (hasWallet && onConnect) {
            onConnect();
            return;
          }

          onSelectWallet?.();
        }}
        type="button"
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            connected
              ? "bg-[var(--success)] shadow-[0_0_14px_rgba(166,255,210,0.55)]"
              : "bg-[var(--cyan)]"
          }`}
        />
        <span className="font-label text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
          {connected && publicKey
            ? shortenAddress(publicKey)
            : connecting
              ? "Connecting"
              : hasWallet && walletName === "Phantom"
                ? "Connect Phantom"
                : "Connect wallet"}
        </span>
      </button>

      {panel === "disconnect" ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[220px] rounded-[24px] border border-[var(--line)] bg-[rgba(8,12,17,0.96)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <button
            className="flex w-full items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3 text-left transition hover:border-[rgba(145,230,255,0.18)] hover:bg-[rgba(145,230,255,0.05)]"
            onClick={() => {
              setPanel(null);
              onDisconnect?.();
            }}
            type="button"
          >
            <span className="font-display text-sm font-semibold text-[var(--text)]">
              Disconnect
            </span>
            <span className="font-label text-[10px] uppercase tracking-[0.16em] text-[var(--danger)]">
              Wallet
            </span>
          </button>
        </div>
      ) : null}

      {panel === "picker" ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[280px] rounded-[24px] border border-[var(--line)] bg-[rgba(8,12,17,0.96)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="mb-2 px-1">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Phantom
            </span>
          </div>

          <button
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
              phantomUnavailable
                ? "cursor-not-allowed border-white/6 bg-white/[0.03] opacity-45"
                : "border-white/6 bg-white/[0.03] hover:border-[rgba(145,230,255,0.18)] hover:bg-[rgba(145,230,255,0.05)]"
            }`}
            disabled={phantomUnavailable}
            onClick={() => {
              if (!selectWallet) {
                return;
              }

              setPendingWalletName("Phantom");
              selectWallet("Phantom");
              setPanel(null);
            }}
            type="button"
          >
            {phantomIcon ? (
              <img
                alt="Phantom"
                className="h-9 w-9 rounded-full border border-white/10 bg-white/5 object-cover"
                src={phantomIcon}
              />
            ) : (
              <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-semibold text-[var(--text)]">
                Phantom
              </div>
              <div className="font-label text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {getWalletStateLabel(phantomReadyState)}
              </div>
            </div>
          </button>
        </div>
      ) : null}
    </div>
  );
}
