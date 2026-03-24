"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import SwapScene from "@/components/SwapScene";
import { SwapPanel } from "@/components/SwapPanel";
import { useSwapState } from "@/hooks/useSwapState";
import { shortenAddress } from "@/lib/solana";
import { getTokenDisplaySymbol } from "@/lib/tokens";

const DESKTOP_NAV_ITEMS = ["Swap", "Market", "Stake", "Governance"] as const;
const SIDEBAR_ITEMS: Array<{ active?: boolean; icon: string; label: string }> = [
  { icon: "bar_chart", label: "Analytics" },
  { icon: "history", label: "History" },
  { icon: "water_drop", label: "Liquidity", active: true },
  { icon: "auto_awesome_motion", label: "Bridge" },
] as const;

const METRICS: Array<{ accent?: boolean; label: string; value: string }> = [
  { label: "24H Volume", value: "$4.2B" },
  { accent: true, label: "TPS Index", value: "2,842" },
  { label: "Protocol TVL", value: "$18.9B" },
] as const;

export function SwapExperience() {
  const swap = useSwapState();
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const walletLabel = connected && publicKey ? shortenAddress(publicKey, 3) : "Connect Wallet";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      window.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="dex-shell min-h-screen overflow-x-hidden bg-[var(--bg)]">
      <header className="topbar-surface fixed inset-x-0 top-0 z-50">
        <div
          className="mx-auto flex h-[78px] w-full max-w-[1360px] items-center justify-between gap-3 px-4 sm:px-5 md:px-6 lg:px-7"
          ref={mobileMenuRef}
        >
          <div className="shrink-0 font-display text-[clamp(1.55rem,1.8vw,1.8rem)] font-black tracking-[-0.06em] text-[var(--cyan)] drop-shadow-[0_0_12px_rgba(0,229,255,0.42)]">
            KINETIC_DEX
          </div>

          <nav className="hidden items-center gap-[clamp(1.45rem,2.5vw,2.2rem)] min-[1100px]:flex">
            {DESKTOP_NAV_ITEMS.map((item) => (
              <a
                className={`font-display text-[clamp(0.88rem,0.9vw,0.95rem)] font-bold uppercase tracking-[0.01em] transition-colors ${
                  item === "Swap"
                    ? "border-b-2 border-[var(--cyan)] pb-1 text-[var(--cyan)]"
                    : "text-slate-500 hover:text-slate-200"
                }`}
                href="#"
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3 min-[1100px]:gap-4">
            <button
              aria-controls="mobile-nav-panel"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-cyan-400/10 hover:text-cyan-300 min-[1100px]:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              type="button"
            >
              <span className="material-symbols-outlined">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>

            <div className="hidden items-center gap-1 text-slate-400 min-[1100px]:flex">
              <TopbarIcon icon="settings" />
              <TopbarIcon icon="account_balance_wallet" />
            </div>

            <div className="flex items-center gap-2 min-[1100px]:hidden">
              <TopbarIcon icon="settings" />
              <TopbarIcon icon="notifications" />
            </div>

            <button
              className="connect-wallet-btn flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold text-[#042a2d] sm:px-5 min-[1100px]:min-w-[clamp(168px,15vw,190px)] min-[1100px]:px-6 min-[1100px]:py-3 min-[1100px]:text-[clamp(0.92rem,0.9vw,0.98rem)]"
              onClick={() => setVisible(true)}
              type="button"
            >
              <span className="hidden min-[1100px]:inline">{walletLabel}</span>
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.16em] min-[1100px]:hidden">
                {connected && publicKey ? shortenAddress(publicKey, 3) : "Wallet"}
              </span>
            </button>
          </div>

          <div
            className={`absolute left-4 right-4 top-[calc(100%+10px)] rounded-[24px] border border-white/8 bg-[rgba(10,14,20,0.96)] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-200 min-[1100px]:hidden ${
              mobileMenuOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-2 opacity-0"
            }`}
            id="mobile-nav-panel"
          >
            <nav className="grid gap-1">
              {DESKTOP_NAV_ITEMS.map((item) => (
                <a
                  className={`flex items-center rounded-2xl px-4 py-3 font-display text-[0.95rem] font-bold uppercase tracking-[0.05em] transition-colors ${
                    item === "Swap"
                      ? "bg-[rgba(0,222,236,0.12)] text-[var(--cyan)]"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  href="#"
                  key={item}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <aside className="sidebar-surface fixed bottom-0 left-0 top-[78px] z-40 hidden w-[84px] flex-col items-center justify-between py-7 min-[1280px]:flex">
        <div className="flex w-full flex-col items-center gap-6 px-4">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              className={`sidebar-item group flex w-full items-center justify-center rounded-2xl px-3 py-3 text-slate-500 transition-all hover:text-slate-200 ${
                item.active
                  ? "border-r-4 border-[var(--cyan)] bg-[rgba(0,222,236,0.15)] text-[var(--cyan)] shadow-[0_0_18px_rgba(0,229,255,0.12)]"
                  : "hover:bg-white/[0.03]"
              }`}
              key={item.label}
              type="button"
            >
              <span className="material-symbols-outlined text-[1.45rem]">{item.icon}</span>
              <span className="pointer-events-none absolute left-[88px] rounded-xl border border-white/6 bg-[rgba(15,19,26,0.92)] px-3 py-2 font-label text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] opacity-0 shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.03)] shadow-[0_14px_24px_rgba(0,0,0,0.35)]">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-[linear-gradient(145deg,#172130,#0b1118)] text-[var(--cyan)]">
              <span className="material-symbols-outlined text-[1.9rem]">person</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="mx-auto min-h-screen w-full max-w-[1360px] px-4 pb-28 pt-[90px] sm:px-5 sm:pt-[94px] md:px-6 md:pt-[96px] lg:px-7 lg:pb-12 lg:pt-[102px] min-[1280px]:pl-[111px]">
        <div className="grid gap-5 md:gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] min-[1100px]:items-start min-[1100px]:gap-[clamp(24px,2.8vw,34px)]">
        <section className="flex min-w-0 flex-col gap-5 md:gap-6">
          <div className="panel-surface relative overflow-hidden rounded-[32px] lg:rounded-[34px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(0,222,236,0.10),transparent_26%),radial-gradient(circle_at_84%_16%,rgba(0,114,255,0.08),transparent_22%),linear-gradient(180deg,rgba(10,14,20,0.68),rgba(8,10,14,0.92))]" />

            <div className="relative z-10 flex h-full flex-col p-4 sm:p-5 md:p-6 min-[1100px]:p-[clamp(18px,1.8vw,26px)]">
              <section className="scene-shell relative mt-0 w-full">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] shadow-2xl sm:aspect-[16/10] min-[1100px]:aspect-[16/9] min-[1100px]:border min-[1100px]:border-[rgba(143,245,255,0.14)] min-[1100px]:bg-[linear-gradient(180deg,rgba(8,15,21,0.92),rgba(6,9,14,0.98))] min-[1100px]:p-[clamp(14px,1.4vw,20px)] min-[1100px]:shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
                  <div className="absolute inset-0 min-[1100px]:hidden">
                    <SwapScene
                      activeSwap={swap.activeSwap}
                      currentFromToken={swap.fromToken}
                      currentToToken={swap.toToken}
                      lastReceipt={swap.lastReceipt}
                      phase={swap.phase}
                      runId={swap.runId}
                    />
                  </div>

                  <div className="absolute inset-0 hidden min-[1100px]:block min-[1100px]:p-[clamp(14px,1.3vw,20px)]">
                    <div className="scene-frame relative h-full overflow-hidden rounded-[22px] border border-[rgba(143,245,255,0.12)]">
                      <SwapScene
                        activeSwap={swap.activeSwap}
                        currentFromToken={swap.fromToken}
                        currentToToken={swap.toToken}
                        lastReceipt={swap.lastReceipt}
                        phase={swap.phase}
                        runId={swap.runId}
                      />
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-primary/5 via-transparent to-surface min-[1100px]:rounded-[28px]" />

                  <div className="glass-panel absolute left-4 top-4 z-20 flex flex-col gap-1 rounded-xl border border-white/5 p-3 min-[1100px]:left-6 min-[1100px]:top-6 min-[1100px]:rounded-2xl min-[1100px]:px-4 min-[1100px]:py-3">
                    <span className="font-label text-[10px] uppercase tracking-widest text-[var(--muted)]">
                      Network Load
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--cyan)]" />
                      <span className="font-display text-sm font-bold text-[var(--cyan)]">
                        OPTIMAL
                      </span>
                    </div>
                  </div>

                  <div className="absolute bottom-7 right-4 z-20 text-right min-[1100px]:bottom-6 min-[1100px]:right-6">
                    <div className="font-display text-[1.8rem] font-bold tracking-tighter text-white min-[1100px]:text-[clamp(1.45rem,1.75vw,1.9rem)]">
                      {getTokenDisplaySymbol(swap.fromToken)}/{getTokenDisplaySymbol(swap.toToken)}
                    </div>
                    <div className="font-label text-xs text-[var(--cyan)] min-[1100px]:text-[0.8rem]">
                      +4.28% <span className="ml-1 text-[10px] text-[var(--muted)]">24H</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-5 hidden gap-4 min-[1100px]:grid min-[1100px]:grid-cols-3">
                <MetricCards />
              </section>
            </div>
          </div>

          <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 min-[1100px]:hidden">
            <MetricCards mobile />
          </section>
        </section>

        <section className="w-full min-[1100px]:w-full min-[1100px]:max-w-[420px] min-[1100px]:justify-self-end min-[1100px]:pt-3">
          <SwapPanel {...swap} />
        </section>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-3xl border-t border-slate-800/50 bg-slate-950/80 px-4 pb-6 pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-lg min-[1100px]:hidden">
        <a className="font-label flex flex-col items-center justify-center rounded-xl bg-cyan-400/10 px-4 py-2 text-[10px] uppercase tracking-widest text-cyan-400 transition-all" href="#">
          <span className="material-symbols-outlined mb-1">swap_horiz</span>
          <span>Swap</span>
        </a>
        <a className="font-label flex flex-col items-center justify-center px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 transition-all" href="#">
          <span className="material-symbols-outlined mb-1">show_chart</span>
          <span>Market</span>
        </a>
        <a className="font-label flex flex-col items-center justify-center px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 transition-all" href="#">
          <span className="material-symbols-outlined mb-1">pie_chart</span>
          <span>Portfolio</span>
        </a>
        <a className="font-label flex flex-col items-center justify-center px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 transition-all" href="#">
          <span className="material-symbols-outlined mb-1">menu</span>
          <span>More</span>
        </a>
      </nav>

      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-64 w-64 rounded-full bg-[rgba(143,245,255,0.05)] blur-[100px]" />
      <div className="pointer-events-none fixed -right-20 bottom-1/4 -z-10 h-80 w-80 rounded-full bg-[rgba(172,137,255,0.05)] blur-[120px]" />
    </div>
  );
}

function MetricCards({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {METRICS.map((metric) => (
        <div
          className={`rounded-2xl border p-4 lg:rounded-[24px] lg:p-6 ${
            metric.accent
              ? "border-[rgba(143,245,255,0.12)] bg-[rgba(143,245,255,0.04)]"
              : "border-white/5 bg-[rgba(17,20,23,0.46)]"
          } ${mobile && metric.label === "Protocol TVL" ? "hidden" : ""}`}
          key={metric.label}
        >
          <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            {metric.label}
          </p>
          <p
            className={`mt-3 font-display font-bold tracking-[-0.04em] ${
              metric.accent ? "text-[var(--cyan)]" : "text-[var(--text)]"
            } ${mobile ? "text-xl" : "text-[clamp(2rem,2.4vw,2.35rem)]"}`}
          >
            {metric.value}
          </p>
        </div>
      ))}
    </>
  );
}

function TopbarIcon({ icon }: { icon: string }) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-cyan-400/10 hover:text-cyan-300"
      type="button"
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
}
