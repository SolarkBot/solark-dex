"use client";

import { useEffect, useState } from "react";
import {
  type SwapPhase,
  type SwapQuote,
  type SwapReceipt,
} from "@/lib/mockSwap";
import {
  PRESET_TOKEN_BY_SYMBOL,
  PRESET_TOKENS,
  formatPercent,
  formatTokenAmount,
  getTokenDisplaySymbol,
  type TokenConfig,
} from "@/lib/tokens";

type TokenSearchResult = {
  decimals: number | null;
  logoUri: string | null;
  mint: string;
  name: string;
  symbol: string;
};

type SwapPanelProps = {
  activeSwap: {
    amountIn: number;
    fromToken: TokenConfig;
    quote: SwapQuote;
    toToken: TokenConfig;
    walletAddress: string;
  } | null;
  amount: string;
  balances: Record<string, number>;
  canSwap: boolean;
  error: string | null;
  executeSwap: () => Promise<void>;
  fromToken: TokenConfig;
  lastReceipt: SwapReceipt | null;
  phase: SwapPhase;
  quote: SwapQuote | null;
  quoteLoading: boolean;
  resolveFromMint: (mint?: string) => Promise<void>;
  resolveToMint: (mint?: string) => Promise<void>;
  setAmount: (value: string) => void;
  setPresetFromToken: (symbol: string) => void;
  setPresetToToken: (symbol: string) => void;
  setSlippageBps: (value: number) => void;
  slippageBps: number;
  status: string;
  swapTokens: () => void;
  toToken: TokenConfig;
  walletConnected: boolean;
  working: boolean;
};

const FALLBACK_BALANCES: Record<string, number> = {
  SOL: 12.45,
  SOLBOT: 0,
  USDC: 420,
};

const buttonLabelByPhase: Record<SwapPhase, string> = {
  idle: "Execute Swap",
  preparing: "Preparing Route",
  approach: "Signing Swap",
  exchange: "Broadcasting",
  return: "Settling",
  success: "Swap Complete",
  error: "Retry Swap",
};

async function fetchTokenSearchResults(query: string) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("query", query.trim());
  }

  const response = await fetch(`/api/jupiter/tokens?${params.toString()}`, {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | TokenSearchResult[]
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      (data && typeof data === "object" && "error" in data && data.error) ||
        "Unable to search tokens.",
    );
  }

  return Array.isArray(data) ? data : [];
}

export function SwapPanel({
  amount,
  balances,
  canSwap,
  error,
  executeSwap,
  fromToken,
  phase,
  quote,
  quoteLoading,
  resolveFromMint,
  resolveToMint,
  setAmount,
  setPresetFromToken,
  setPresetToToken,
  setSlippageBps,
  slippageBps,
  status,
  swapTokens,
  toToken,
  walletConnected,
  working,
}: SwapPanelProps) {
  const fromBalance = walletConnected
    ? balances[fromToken.mint] ?? 0
    : FALLBACK_BALANCES[fromToken.symbol] ?? 0;
  const toBalance = walletConnected
    ? balances[toToken.mint] ?? 0
    : FALLBACK_BALANCES[toToken.symbol] ?? 0;
  const [searchSide, setSearchSide] = useState<"from" | "to" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);

  useEffect(() => {
    if (!searchSide) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const results = await fetchTokenSearchResults(searchQuery);

        if (!controller.signal.aborted) {
          setSearchResults(results);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to search Jupiter tokens.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, searchSide]);

  const closeSearch = () => {
    setSearchSide(null);
    setSearchQuery("");
    setSearchError(null);
    setSearchLoading(false);
  };

  const selectSearchToken = async (side: "from" | "to", token: TokenSearchResult) => {
    const presetMatch = PRESET_TOKEN_BY_SYMBOL[token.symbol];

    closeSearch();

    if (side === "from") {
      if (presetMatch?.mint === token.mint) {
        setPresetFromToken(presetMatch.symbol);
        return;
      }

      await resolveFromMint(token.mint);
      return;
    }

    if (presetMatch?.mint === token.mint) {
      setPresetToToken(presetMatch.symbol);
      return;
    }

    await resolveToMint(token.mint);
  };

  return (
    <>
      <section className="panel-surface relative overflow-hidden rounded-[30px] p-5 min-[1100px]:rounded-[30px] min-[1100px]:p-[clamp(22px,2vw,28px)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[rgba(143,245,255,0.09)] blur-[96px] transition-all duration-700 lg:h-64 lg:w-64" />

        <div className="relative z-10 flex flex-col gap-4 min-[1100px]:gap-[clamp(16px,1.6vw,20px)]">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text)] min-[1100px]:text-[clamp(1.6rem,1.8vw,1.9rem)] min-[1100px]:tracking-[-0.05em]">
                <span className="min-[1100px]:hidden">Swap</span>
                <span className="hidden min-[1100px]:inline">SWAP_TERMINAL</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 min-[1100px]:flex">
                <button
                  className="material-symbols-outlined text-slate-400 transition-colors hover:text-[var(--cyan)]"
                  type="button"
                >
                  refresh
                </button>
                <button
                  className="material-symbols-outlined text-slate-400 transition-colors hover:text-[var(--cyan)]"
                  onClick={() => setSlippageBps(50)}
                  type="button"
                >
                  tune
                </button>
              </div>

              <button
                className="font-label text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]"
                onClick={() => setSlippageBps(50)}
                type="button"
              >
                Slippage {(slippageBps / 100).toFixed(1)}%
              </button>
            </div>
          </header>

          <SwapField
            amount={amount}
            balance={formatTokenAmount(fromBalance, fromToken)}
            currentToken={fromToken}
            onAmountChange={setAmount}
            onPresetChange={setPresetFromToken}
            onSearch={() => setSearchSide("from")}
            side="sell"
          />

          <div className="relative flex h-2 items-center justify-center min-[1100px]:h-1">
            <div className="absolute inset-x-0 h-px bg-white/[0.08]" />
            <button
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(30,35,42,0.92)] text-[var(--cyan)] shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition-all hover:scale-105 active:scale-[0.97] min-[1100px]:h-[clamp(46px,4vw,52px)] min-[1100px]:w-[clamp(46px,4vw,52px)]"
              onClick={swapTokens}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">swap_vert</span>
            </button>
          </div>

          <SwapField
            amount={
              quote
                ? quote.estimatedAmountOut.toLocaleString("en-US", {
                    maximumFractionDigits: Math.min(2, toToken.decimals),
                  })
                : "0.00"
            }
            balance={quote ? `Est. ${formatTokenAmount(quote.minimumReceived, toToken)}` : `Est. ${formatTokenAmount(0, toToken)}`}
            currentToken={toToken}
            onAmountChange={() => undefined}
            onPresetChange={setPresetToToken}
            onSearch={() => setSearchSide("to")}
            readOnly
            side="buy"
          />

          <div className="rounded-[22px] border border-white/[0.05] bg-white/[0.02] p-4 min-[1100px]:p-[clamp(14px,1.4vw,16px)]">
            <div className="space-y-2.5">
              <DetailRow
                label="Price Impact"
                value={quote ? formatPercent(quote.priceImpactPct) : "< 0.01%"}
                valueClassName="text-[var(--cyan)]"
              />
              <DetailRow label="Protocol Fee" value="$0.42" />
              <DetailRow
                label="Slippage Tolerance"
                value={`${(slippageBps / 100).toFixed(1)}%`}
              />
            </div>
          </div>

          <button
            className={`font-display flex h-[58px] w-full items-center justify-center rounded-[18px] text-base font-black uppercase tracking-[0.18em] transition-all active:scale-[0.98] min-[1100px]:h-[clamp(58px,5vw,62px)] min-[1100px]:text-[clamp(0.94rem,0.95vw,1rem)] ${
              canSwap
                ? "connect-wallet-btn text-[#042a2d] shadow-[0_0_28px_rgba(0,229,255,0.24)]"
                : "border border-white/10 bg-white/[0.04] text-[var(--muted)]"
            }`}
            disabled={!canSwap}
            onClick={() => void executeSwap()}
            type="button"
          >
            {quoteLoading && !working ? "Fetching Quote" : buttonLabelByPhase[phase]}
          </button>

          <div className="min-h-[18px] px-1 pt-0.5">
            <p className={`text-[11px] ${error ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
              {error || status}
            </p>
          </div>
        </div>
      </section>

      {searchSide ? (
        <TokenSearchDialog
          error={searchError}
          loading={searchLoading}
          onClose={closeSearch}
          onQueryChange={setSearchQuery}
          onSelect={(token) => void selectSearchToken(searchSide, token)}
          query={searchQuery}
          results={searchResults}
          side={searchSide}
        />
      ) : null}
    </>
  );
}

function SwapField({
  amount,
  balance,
  currentToken,
  onAmountChange,
  onPresetChange,
  onSearch,
  readOnly = false,
  side,
}: {
  amount: string;
  balance: string;
  currentToken: TokenConfig;
  onAmountChange: (value: string) => void;
  onPresetChange: (symbol: string) => void;
  onSearch: () => void;
  readOnly?: boolean;
  side: "sell" | "buy";
}) {
  return (
    <div className="space-y-2 min-[1100px]:space-y-1.5">
      <div className="flex items-end justify-between px-1">
        <span className="font-label text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] min-[1100px]:text-[0.78rem]">
          {side}
        </span>
        <span className="font-label text-[10px] text-[var(--muted)] min-[1100px]:text-[0.8rem]">
          {side === "sell" ? `Bal: ${balance}` : balance}
        </span>
      </div>

      <div className="rounded-[22px] border border-white/[0.04] bg-[#020304] p-4 min-[1100px]:p-[clamp(16px,1.7vw,20px)]">
        <div className="flex items-center gap-3">
          <input
            className="min-w-0 flex-1 border-none bg-transparent p-0 font-display text-[2rem] font-bold tracking-[-0.05em] text-[var(--text)] focus:ring-0 min-[1100px]:text-[clamp(1.95rem,2.3vw,2.25rem)]"
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.00"
            readOnly={readOnly}
            type="number"
            value={amount}
          />

          <div className="flex items-center gap-2">
            <TokenSelectButton currentToken={currentToken} onChange={onPresetChange} />
            <SearchTokenButton onClick={onSearch} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TokenSelectButton({
  currentToken,
  onChange,
}: {
  currentToken: TokenConfig;
  onChange: (symbol: string) => void;
}) {
  const value = currentToken.isPreset ? currentToken.symbol : "__CUSTOM__";

  return (
    <div className="relative">
      <div className="flex min-w-[114px] items-center gap-2 rounded-[18px] border border-white/[0.08] bg-[#22262f] px-3 py-2.5 min-[1100px]:min-w-[clamp(124px,10vw,138px)] min-[1100px]:rounded-full min-[1100px]:px-[clamp(14px,1.2vw,16px)] min-[1100px]:py-[clamp(10px,1vw,12px)]">
        <TokenLogo token={currentToken} />
        <span className="font-display text-base font-bold text-[var(--text)]">
          {getTokenDisplaySymbol(currentToken)}
        </span>
      </div>
      <select
        className="absolute inset-0 appearance-none opacity-0"
        onChange={(event) => {
          if (event.target.value !== "__CUSTOM__") {
            onChange(event.target.value);
          }
        }}
        value={value}
      >
        {!currentToken.isPreset ? (
          <option value="__CUSTOM__">{getTokenDisplaySymbol(currentToken)}</option>
        ) : null}
        {PRESET_TOKENS.map((token) => (
          <option key={token.symbol} value={token.symbol}>
            {token.symbol}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
        expand_more
      </span>
    </div>
  );
}

function SearchTokenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="flex h-[46px] w-[46px] items-center justify-center rounded-[16px] border border-[rgba(143,245,255,0.16)] bg-[rgba(143,245,255,0.05)] text-[var(--cyan)] transition-all hover:border-[rgba(143,245,255,0.26)] hover:bg-[rgba(143,245,255,0.09)] active:scale-[0.98] min-[1100px]:h-[clamp(46px,4vw,52px)] min-[1100px]:w-[clamp(46px,4vw,52px)] min-[1100px]:rounded-[18px]"
      onClick={onClick}
      type="button"
    >
      <span className="material-symbols-outlined text-[20px]">search</span>
    </button>
  );
}

function TokenSearchDialog({
  error,
  loading,
  onClose,
  onQueryChange,
  onSelect,
  query,
  results,
  side,
}: {
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSelect: (token: TokenSearchResult) => void;
  query: string;
  results: TokenSearchResult[];
  side: "from" | "to";
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm lg:items-center">
      <div className="panel-surface w-full max-w-[430px] rounded-[28px] p-4 lg:max-w-[560px] lg:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-base font-bold text-[var(--text)]">
              Search {side === "from" ? "sell" : "buy"} token
            </div>
            <div className="font-label text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Jupiter token discovery
            </div>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-[var(--muted)]"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <input
          autoFocus
          className="mb-3 h-11 w-full rounded-xl border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 font-label text-[12px] tracking-[0.04em] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[rgba(143,245,255,0.24)] focus:outline-none"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search symbol, name, or paste mint"
          spellCheck={false}
          value={query}
        />

        <div className="mb-2 flex items-center justify-between">
          <span className="font-label text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {query.trim() ? "Results" : "Popular"}
          </span>
          {loading ? (
            <span className="font-label text-[10px] uppercase tracking-[0.18em] text-[var(--cyan)]">
              Searching
            </span>
          ) : null}
        </div>

        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {results.map((token) => (
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3 text-left transition-all hover:border-[rgba(143,245,255,0.18)] hover:bg-[rgba(143,245,255,0.05)]"
              key={token.mint}
              onClick={() => onSelect(token)}
              type="button"
            >
              <TokenMark
                accent="#8ff5ff"
                logoUri={token.logoUri}
                primary="#101317"
                symbol={token.symbol}
              />
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-bold text-[var(--text)]">
                  {token.symbol}
                </div>
                <div className="truncate text-[11px] text-[var(--muted)]">
                  {token.name}
                </div>
              </div>
              <span className="truncate font-label text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
              </span>
            </button>
          ))}

          {!loading && !results.length ? (
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-4 text-center">
              <div className="font-display text-sm font-bold text-[var(--text)]">
                No tokens found
              </div>
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                Search a symbol or paste the Solana mint address here.
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-[18px] pt-3">
          <p className={`text-[11px] ${error ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
            {error || "Pick a popular token or search any mint supported by Jupiter."}
          </p>
        </div>
      </div>
    </div>
  );
}

function TokenLogo({ token }: { token: TokenConfig }) {
  return (
    <TokenMark
      accent={token.visual.accent}
      logoUri={token.logoUri}
      primary={token.visual.primary}
      symbol={token.symbol}
    />
  );
}

function TokenMark({
  accent,
  logoUri,
  primary,
  symbol,
}: {
  accent: string;
  logoUri?: string | null;
  primary: string;
  symbol: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [logoUri]);

  return (
    <div
      className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/8"
      style={{ background: `linear-gradient(135deg, ${accent}, ${primary})` }}
    >
      {logoUri && !imageFailed ? (
        <img
          alt={symbol}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
          src={logoUri}
        />
      ) : (
        <span className="font-label text-[10px] font-bold uppercase text-[#081017]">
          {symbol.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClassName = "text-[var(--text)]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={`font-display text-[1.05rem] font-medium ${valueClassName}`}>{value}</span>
    </div>
  );
}
