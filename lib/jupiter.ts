import { type SwapQuote } from "@/lib/mockSwap";
import { baseUnitsToDecimal, type TokenConfig } from "@/lib/tokens";

export type JupiterOrderResponse = {
  errorCode?: number;
  errorMessage?: string;
  feeBps: number;
  inAmount: string;
  inputMint: string;
  otherAmountThreshold: string;
  outAmount: string;
  outputMint: string;
  priceImpact?: number;
  priceImpactPct?: string;
  requestId: string;
  routePlan: Array<{
    swapInfo?: {
      label?: string;
    };
  }>;
  router: string;
  slippageBps: number;
  simulationError?: {
    error?: string;
    errorCode?: string;
  } | null;
  transaction: string | null;
  lastValidBlockHeight?: number;
};

export type JupiterSwapQuoteResponse = {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct?: string;
  routePlan: Array<{
    swapInfo?: {
      label?: string;
    };
  }>;
  platformFee?: {
    feeBps?: number;
  } | null;
};

export type JupiterSwapBuildResponse = {
  lastValidBlockHeight?: number;
  simulationError?: {
    error?: string;
    errorCode?: string;
  } | null;
  swapTransaction: string;
};

export function toOrderResponse(
  quote: JupiterSwapQuoteResponse,
  transaction: string | null,
  requestId: string,
  lastValidBlockHeight?: number,
  simulationError?: JupiterOrderResponse["simulationError"],
): JupiterOrderResponse {
  return {
    feeBps: quote.platformFee?.feeBps ?? 0,
    inAmount: quote.inAmount,
    inputMint: quote.inputMint,
    lastValidBlockHeight,
    otherAmountThreshold: quote.otherAmountThreshold,
    outAmount: quote.outAmount,
    outputMint: quote.outputMint,
    priceImpactPct: quote.priceImpactPct,
    requestId,
    routePlan: quote.routePlan,
    router: "swap-api",
    simulationError,
    slippageBps: quote.slippageBps,
    transaction,
  };
}

export function normalizeOrderToQuote(
  order: JupiterOrderResponse,
  fromToken: TokenConfig,
  toToken: TokenConfig,
  inputAmount: number,
): SwapQuote {
  const estimatedAmountOut = baseUnitsToDecimal(order.outAmount, toToken.decimals);
  const minimumReceived = baseUnitsToDecimal(
    order.otherAmountThreshold,
    toToken.decimals,
  );
  const exchangeRate = inputAmount > 0 ? estimatedAmountOut / inputAmount : 0;
  const rawPriceImpact =
    typeof order.priceImpact === "number"
      ? order.priceImpact
      : Number(order.priceImpactPct ?? 0);
  const routeLabels = Array.from(
    new Set(
      order.routePlan
        .map((route) => route.swapInfo?.label?.trim())
        .filter((label): label is string => Boolean(label)),
    ),
  );

  return {
    estimatedAmountOut,
    exchangeRate,
    minimumReceived,
    priceImpactPct: Number.isFinite(rawPriceImpact) ? rawPriceImpact : 0,
    provider: order.router === "swap-api" ? "Jupiter Swap" : "Jupiter Ultra",
    requestId: order.requestId,
    routeFeePct: order.feeBps / 100,
    routeLabel:
      routeLabels.join(" + ") || `Router ${order.router.toUpperCase()}`,
    slippageBps: order.slippageBps,
  };
}
