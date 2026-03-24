"use client";

import { CUSTOM_TOKEN_OPTION } from "@/hooks/useSwapFlow";
import { type MockSwapResult, type SwapFlowPhase } from "@/lib/mockSwap";
import { getTokenDisplaySymbol, type TokenConfig } from "@/lib/tokens";

type FloatingSwapControlsProps = {
  amount: string;
  availableTokens: TokenConfig[];
  canSwap: boolean;
  connected: boolean;
  error: string | null;
  fromCustomInput: string;
  fromToken: TokenConfig;
  onAmountChange: (value: string) => void;
  onFromChange: (mint: string) => void;
  onFromCustomInputChange: (value: string) => void;
  onResolveFromCustom: () => void;
  onResolveToCustom: () => void;
  onSwap: () => void;
  onToChange: (mint: string) => void;
  onToCustomInputChange: (value: string) => void;
  phase: SwapFlowPhase;
  receipt: MockSwapResult | null;
  resolvingFromCustom: boolean;
  resolvingToCustom: boolean;
  showFromCustomInput: boolean;
  showToCustomInput: boolean;
  status: string;
  toCustomInput: string;
  toToken: TokenConfig;
};

type CustomInputRowProps = {
  onChange: (value: string) => void;
  onResolve: () => void;
  placeholder: string;
  resolving: boolean;
  value: string;
};

function getButtonLabel(phase: SwapFlowPhase, connected: boolean) {
  if (!connected) {
    return "Wallet required";
  }

  if (phase === "signing" || phase === "confirming") {
    return "Swapping...";
  }

  if (phase === "settled" || phase === "departing") {
    return "Clearing lane";
  }

  if (phase === "recovering") {
    return "Recovering";
  }

  if (phase === "success") {
    return "Swap again";
  }

  return "Confirm swap";
}

function CustomInputRow({
  onChange,
  onResolve,
  placeholder,
  resolving,
  value,
}: CustomInputRowProps) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        className="amount-input min-w-0 flex-1 rounded-[0.85rem] border px-3 py-2 text-[0.78rem] tracking-[-0.02em]"
        disabled={resolving}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onResolve();
          }
        }}
        placeholder={placeholder}
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderColor: "var(--line)",
          color: "var(--text)",
        }}
        value={value}
      />
      <button
        className="rounded-[0.85rem] border px-3 py-2 font-label text-[0.62rem] uppercase tracking-[0.14em] transition disabled:opacity-40"
        disabled={resolving}
        onClick={onResolve}
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderColor: "var(--line)",
          color: "var(--text)",
        }}
        type="button"
      >
        {resolving ? "..." : "Add"}
      </button>
    </div>
  );
}

export function FloatingSwapControls({
  amount,
  availableTokens,
  canSwap,
  connected,
  error,
  fromCustomInput,
  fromToken,
  onAmountChange,
  onFromChange,
  onFromCustomInputChange,
  onResolveFromCustom,
  onResolveToCustom,
  onSwap,
  onToChange,
  onToCustomInputChange,
  phase,
  receipt,
  resolvingFromCustom,
  resolvingToCustom,
  showFromCustomInput,
  showToCustomInput,
  status,
  toCustomInput,
  toToken,
}: FloatingSwapControlsProps) {
  return (
    <section className="control-shell swap-controls rounded-[1.35rem] p-1.5 sm:p-2">
      <div className="swap-controls-grid relative z-10 grid gap-1.5 sm:grid-cols-2">
        <label className="control-field swap-controls-field block px-3 py-2">
          <span className="font-label text-[9px] uppercase tracking-[0.24em] text-[var(--muted)]">
            From
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: fromToken.visual.glow }}
            />
            <select
              className="token-select text-[0.88rem] font-medium tracking-[-0.03em]"
              disabled={resolvingFromCustom}
              onChange={(event) => onFromChange(event.target.value)}
              value={fromToken.mint}
            >
              {availableTokens.map((token) => (
                <option key={token.mint} value={token.mint}>
                  {getTokenDisplaySymbol(token)}
                </option>
              ))}
              <option value={CUSTOM_TOKEN_OPTION}>Custom CA...</option>
            </select>
          </div>
          {showFromCustomInput ? (
            <CustomInputRow
              onChange={onFromCustomInputChange}
              onResolve={onResolveFromCustom}
              placeholder="Paste custom CA"
              resolving={resolvingFromCustom}
              value={fromCustomInput}
            />
          ) : null}
        </label>

        <label className="control-field swap-controls-field block px-3 py-2">
          <span className="font-label text-[9px] uppercase tracking-[0.24em] text-[var(--muted)]">
            To
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: toToken.visual.glow }}
            />
            <select
              className="token-select text-[0.88rem] font-medium tracking-[-0.03em]"
              disabled={resolvingToCustom}
              onChange={(event) => onToChange(event.target.value)}
              value={toToken.mint}
            >
              {availableTokens.map((token) => (
                <option key={token.mint} value={token.mint}>
                  {getTokenDisplaySymbol(token)}
                </option>
              ))}
              <option value={CUSTOM_TOKEN_OPTION}>Custom CA...</option>
            </select>
          </div>
          {showToCustomInput ? (
            <CustomInputRow
              onChange={onToCustomInputChange}
              onResolve={onResolveToCustom}
              placeholder="Paste custom CA"
              resolving={resolvingToCustom}
              value={toCustomInput}
            />
          ) : null}
        </label>

        <label className="control-field swap-controls-field block px-3 py-2">
          <span className="font-label text-[9px] uppercase tracking-[0.24em] text-[var(--muted)]">
            Amount
          </span>
          <input
            className="amount-input mt-1 text-[0.92rem] font-medium tracking-[-0.03em]"
            inputMode="decimal"
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.0"
            value={amount}
          />
        </label>

        <button
          className="swap-button swap-controls-button h-[2.8rem] rounded-[0.95rem] px-3 font-display text-[0.78rem] font-semibold uppercase tracking-[0.08em] transition hover:translate-y-[-1px]"
          disabled={!canSwap}
          onClick={onSwap}
          type="button"
        >
          {getButtonLabel(phase, connected)}
        </button>
      </div>

      <div className="swap-controls-footer relative z-10 mt-1.5 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-label text-[7px] uppercase tracking-[0.16em] text-[var(--muted)] sm:max-w-[14rem]">
          {error ?? status}
        </p>

        {receipt ? (
          <p className="font-label text-[7px] uppercase tracking-[0.16em] text-[var(--success)]">
            BOUGHT {receipt.receivedLabel} WITH {receipt.originalAmountLabel} | {receipt.timestamp}
          </p>
        ) : null}
      </div>
    </section>
  );
}
