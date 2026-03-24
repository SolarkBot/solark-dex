"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { shortenAddress } from "@/lib/solana";

function getWalletPriority(state: WalletReadyState) {
  switch (state) {
    case WalletReadyState.Installed:
      return 0;
    case WalletReadyState.Loadable:
      return 1;
    case WalletReadyState.NotDetected:
      return 2;
    default:
      return 3;
  }
}

export function WalletButton() {
  const {
    connect,
    connected,
    connecting,
    disconnect,
    publicKey,
    select,
    wallet,
    wallets,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const [pendingConnectName, setPendingConnectName] = useState<string | null>(null);

  const uniqueWallets = useMemo(() => {
    const deduped = new Map<string, (typeof wallets)[number]>();

    for (const entry of wallets) {
      const existing = deduped.get(entry.adapter.name);

      if (!existing) {
        deduped.set(entry.adapter.name, entry);
        continue;
      }

      if (getWalletPriority(entry.readyState) < getWalletPriority(existing.readyState)) {
        deduped.set(entry.adapter.name, entry);
      }
    }

    return Array.from(deduped.values()).sort((left, right) => {
      const priorityDiff =
        getWalletPriority(left.readyState) - getWalletPriority(right.readyState);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left.adapter.name.localeCompare(right.adapter.name);
    });
  }, [wallets]);

  useEffect(() => {
    if (connected || connecting) {
      setOpen(false);
    }
  }, [connected, connecting]);

  useEffect(() => {
    if (
      !pendingConnectName ||
      connecting ||
      connected ||
      wallet?.adapter.name !== pendingConnectName
    ) {
      return;
    }

    void connect().catch(() => {
      setPendingConnectName(null);
    });
  }, [connect, connected, connecting, pendingConnectName, wallet]);

  useEffect(() => {
    if (connected || !wallet || wallet.adapter.name === pendingConnectName) {
      setPendingConnectName(null);
    }
  }, [connected, pendingConnectName, wallet]);

  return (
    <div className="relative">
      <button
        className="hud-panel inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--line-strong)] hover:bg-white/[0.06]"
        onClick={() => setOpen((current) => !current)}
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
              : "Connect wallet"}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[280px] rounded-[24px] border border-[var(--line)] bg-[rgba(8,12,17,0.96)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Wallets
            </span>
            {connected ? (
              <button
                className="font-label text-[10px] uppercase tracking-[0.18em] text-[var(--danger)]"
                onClick={() => {
                  setOpen(false);
                  void disconnect();
                }}
                type="button"
              >
                Disconnect
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            {uniqueWallets.map((entry) => {
              const disabled = entry.readyState === WalletReadyState.Unsupported;
              const selected = wallet?.adapter.name === entry.adapter.name;
              const stateLabel =
                entry.readyState === WalletReadyState.Installed
                  ? "Installed"
                  : entry.readyState === WalletReadyState.Loadable
                    ? "Loadable"
                    : entry.readyState === WalletReadyState.NotDetected
                      ? "Not detected"
                      : "Unavailable";

              return (
                <button
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    selected
                      ? "border-[rgba(145,230,255,0.34)] bg-[rgba(145,230,255,0.08)]"
                      : "border-white/6 bg-white/[0.03] hover:border-[rgba(145,230,255,0.18)] hover:bg-[rgba(145,230,255,0.05)]"
                  } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                  disabled={disabled}
                  key={entry.adapter.name}
                  onClick={() => {
                    setPendingConnectName(entry.adapter.name);
                    select(entry.adapter.name);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {entry.adapter.icon ? (
                    <img
                      alt={entry.adapter.name}
                      className="h-9 w-9 rounded-full border border-white/10 bg-white/5 object-cover"
                      src={entry.adapter.icon}
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm font-semibold text-[var(--text)]">
                      {entry.adapter.name}
                    </div>
                    <div className="font-label text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                      {stateLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
