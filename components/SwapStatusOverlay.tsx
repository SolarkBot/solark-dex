"use client";

import type { PreparedSwap, SwapPhase, SwapReceipt } from "@/lib/mockSwap";
import {
  formatPercent,
  formatTokenAmount,
  getTokenDisplaySymbol,
} from "@/lib/tokens";
import {
  SWAP_ACTIVE_PHASES,
  SWAP_PHASE_LABELS,
  getSwapProgress,
  isSwapBusy,
} from "@/lib/mockSwap";

type SwapStatusOverlayProps = {
  activeSwap: PreparedSwap | null;
  lastReceipt: SwapReceipt | null;
  phase: SwapPhase;
  status: string;
};

export function SwapStatusOverlay({
  activeSwap,
  lastReceipt,
  phase,
  status,
}: SwapStatusOverlayProps) {
  const working = isSwapBusy(phase);
  const progress = getSwapProgress(phase);

  if (phase === "success" && activeSwap && lastReceipt) {
    return (
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 sm:inset-x-auto sm:right-5 sm:w-[360px]">
        <div className="rounded-[26px] border border-emerald-200/15 bg-[linear-gradient(180deg,rgba(14,23,20,0.94),rgba(8,14,12,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="subtle-label mb-2">Settlement confirmed</div>
              <h3 className="font-display text-2xl text-white">
                {formatTokenAmount(lastReceipt.outputAmount, lastReceipt.toToken)}
              </h3>
            </div>
            <div className="rounded-full border border-emerald-200/15 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
              Success
            </div>
          </div>

          <div className="grid gap-3 text-sm text-[var(--muted)]">
            <div className="flex items-center justify-between">
              <span>Route</span>
              <span className="text-white">
                {getTokenDisplaySymbol(activeSwap.fromToken)} to {getTokenDisplaySymbol(activeSwap.toToken)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Input</span>
              <span className="text-white">
                {formatTokenAmount(activeSwap.amountIn, activeSwap.fromToken)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Price impact</span>
              <span className="text-white">
                {formatPercent(lastReceipt.priceImpactPct)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Receipt</span>
              <span className="text-white">{lastReceipt.signature}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!working) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 sm:left-5 sm:right-5 sm:bottom-5">
      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,16,0.94),rgba(8,11,15,0.98))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="subtle-label mb-2">Swap in flight</div>
            <p className="font-display text-xl text-white">
              {SWAP_PHASE_LABELS[phase]}
            </p>
          </div>
          <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {progress}%
          </div>
        </div>

        <p className="mb-4 max-w-xl text-sm leading-6 text-[var(--muted)]">
          {status}
        </p>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#729fd1,#9fdefe)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          {SWAP_ACTIVE_PHASES.map((step) => {
            const active = step === phase;
            const complete = getSwapProgress(step) <= progress;

            return (
              <div
                className={`rounded-2xl border px-2 py-2 text-center transition ${
                  active
                    ? "border-cyan-200/30 bg-cyan-200/8 text-cyan-50"
                    : complete
                      ? "border-white/10 bg-white/[0.03] text-white/80"
                      : "border-white/5 bg-transparent text-white/40"
                }`}
                key={step}
              >
                {SWAP_PHASE_LABELS[step]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
