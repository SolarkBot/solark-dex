import { type TokenConfig } from "@/lib/tokens";

export type SwapPhase =
  | "idle"
  | "preparing"
  | "approach"
  | "exchange"
  | "return"
  | "success"
  | "error";

export const SWAP_PHASE_DURATIONS = {
  preparing: 900,
  approach: 1500,
  exchange: 1100,
  return: 1450,
} as const;

export const SWAP_ACTIVE_PHASES = [
  "preparing",
  "approach",
  "exchange",
  "return",
] as const satisfies readonly SwapPhase[];

export const SWAP_PHASE_LABELS: Record<SwapPhase, string> = {
  idle: "Ready",
  preparing: "Preparing",
  approach: "Approach",
  exchange: "Exchange",
  return: "Return",
  success: "Success",
  error: "Error",
};

export type SwapQuote = {
  estimatedAmountOut: number;
  exchangeRate: number;
  minimumReceived: number;
  priceImpactPct: number;
  provider: string;
  requestId: string;
  routeFeePct: number;
  routeLabel: string;
  slippageBps: number;
};

export type PreparedSwap = {
  amountIn: number;
  fromToken: TokenConfig;
  quote: SwapQuote;
  toToken: TokenConfig;
  walletAddress: string;
};

export type SwapReceipt = {
  executedAt: string;
  outputAmount: number;
  priceImpactPct: number;
  signature: string;
  toToken: TokenConfig;
};

export type SwapFlowPhase =
  | "idle"
  | "tokenSelection"
  | "locatingAgents"
  | "approaching"
  | "ready"
  | "signing"
  | "confirming"
  | "settled"
  | "departing"
  | "recovering"
  | "success"
  | "error";

export const LIVE_SWAP_SCENE_DURATIONS = {
  signingTravel: 700,
  settledHold: 520,
  departing: 1350,
  recovering: 1400,
} as const;

export type MockSwapResult = {
  amountIn: number;
  amountOut: number;
  originalAmountLabel: string;
  receivedLabel: string;
  fromToken: TokenConfig;
  routeLabel: string;
  signature: string;
  timestamp: string;
  toToken: TokenConfig;
};

const TOKEN_USD_REFERENCE: Record<string, number> = {
  SOL: 188,
  USDC: 1,
  SOLBOT: 0.12,
  DRONGO: 0.0002467,
  FML: 0.0005076,
  ONE: 0.0002327,
  CHIBIBEAST: 0.000581,
  LOL: 0.0031,
  CHIBI: 0.002451,
  OPTIMISTIC: 0.001218,
  PEACE: 0.0004217,
  LOST: 0.0001898,
  PIKAHORSE: 0.000296,
};

const FLOW_PHASE_LABELS: Record<SwapFlowPhase, string> = {
  idle: "Roaming market",
  tokenSelection: "Calling agents",
  locatingAgents: "Locating agents",
  approaching: "Agents approaching",
  ready: "Ready to exchange",
  signing: "Awaiting signature",
  confirming: "Confirming on-chain",
  settled: "Swap confirmed",
  departing: "Clearing lane",
  recovering: "Recovering cargo",
  success: "Trade completed",
  error: "Trade blocked",
};

function formatOutput(amount: number) {
  if (amount >= 1000) {
    return amount.toFixed(0);
  }

  if (amount >= 10) {
    return amount.toFixed(2);
  }

  if (amount >= 1) {
    return amount.toFixed(3);
  }

  return amount.toFixed(5);
}

function hashSelection(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function isSwapBusy(phase: SwapPhase) {
  return SWAP_ACTIVE_PHASES.includes(
    phase as (typeof SWAP_ACTIVE_PHASES)[number],
  );
}

export function getSwapProgress(phase: SwapPhase) {
  if (phase === "success") {
    return 100;
  }

  if (phase === "error" || phase === "idle") {
    return 0;
  }

  const phaseIndex = SWAP_ACTIVE_PHASES.indexOf(
    phase as (typeof SWAP_ACTIVE_PHASES)[number],
  );

  return Math.round(((phaseIndex + 1) / SWAP_ACTIVE_PHASES.length) * 100);
}

export function getSwapFlowLabel(phase: SwapFlowPhase) {
  return FLOW_PHASE_LABELS[phase];
}

export async function runMockSwap(params: {
  amount: number;
  fromToken: TokenConfig;
  toToken: TokenConfig;
}) {
  const { amount, fromToken, toToken } = params;
  const seed = hashSelection(`${fromToken.symbol}:${toToken.symbol}:${amount}`);
  const slippage = 0.004 + (seed % 8) * 0.0009;
  const fromUsd = TOKEN_USD_REFERENCE[fromToken.symbol] ?? 1;
  const toUsd = TOKEN_USD_REFERENCE[toToken.symbol] ?? 1;
  const amountOut = (amount * fromUsd * (1 - slippage)) / toUsd;

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 2100);
  });

  return {
    amountIn: amount,
    amountOut,
    originalAmountLabel: `${formatOutput(amount)} ${fromToken.symbol}`,
    receivedLabel: `${formatOutput(amountOut)} ${toToken.symbol}`,
    fromToken,
    routeLabel: `${fromToken.symbol} / ${toToken.symbol} corridor`,
    signature: `swap_${seed.toString(16)}`,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    toToken,
  } satisfies MockSwapResult;
}
