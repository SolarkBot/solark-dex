import { type SwapQuote } from "@/lib/mockSwap";
import { baseUnitsToDecimal, type TokenConfig } from "@/lib/tokens";

export type JupiterOrderResponse = {
  errorCode?: number;
  error?: string;
  errorMessage?: string;
  feeBps: number;
  inAmount: string;
  inUsdValue?: number;
  inputMint: string;
  gasless?: boolean;
  mode?: string;
  otherAmountThreshold: string;
  outAmount: string;
  outUsdValue?: number;
  outputMint: string;
  platformFee?: {
    feeBps?: number;
    feeMint?: string;
  } | null;
  priceImpact?: number;
  priceImpactPct?: string;
  prioritizationFeeLamports?: number;
  requestId: string;
  routePlan: Array<{
    bps?: number;
    percent?: number;
    swapInfo?: {
      ammKey?: string;
      inAmount?: string;
      inputMint?: string;
      label?: string;
      outAmount?: string;
      outputMint?: string;
    };
    usdValue?: number;
  }>;
  signatureFeeLamports?: number;
  swapType?: string;
  swapUsdValue?: number;
  taker?: string | null;
  totalTime?: number;
  router: string;
  feeMint?: string;
  rentFeeLamports?: number;
  slippageBps: number;
  transaction: string | null;
  lastValidBlockHeight?: number;
  simulationError?: {
    error?: string;
    errorCode?: string;
  } | null;
};

export type JupiterExecuteResponse = {
  code: number;
  error?: string;
  inputAmountResult?: string;
  outputAmountResult?: string;
  signature?: string;
  slot?: string;
  status: "Success" | "Failed";
  swapEvents?: Array<{
    inputAmount?: string;
    inputMint?: string;
    outputAmount?: string;
    outputMint?: string;
  }>;
  totalInputAmount?: string;
  totalOutputAmount?: string;
};

const MINIMUM_USEFUL_QUOTE_USD = 0.01;

export function getPreviewOrderError(
  order: JupiterOrderResponse,
  toToken: TokenConfig,
) {
  if (order.errorCode) {
    return order.errorMessage?.trim() || order.error?.trim() || "No route for this pair right now.";
  }

  if (order.errorMessage?.trim()) {
    return order.errorMessage.trim();
  }

  if (!order.requestId?.trim()) {
    return "Jupiter did not return a valid quote request id.";
  }

  if (!/^\d+$/.test(order.outAmount)) {
    return "No route for this pair right now.";
  }

  if (!Array.isArray(order.routePlan) || order.routePlan.length === 0) {
    return "No route for this pair right now.";
  }

  const estimatedAmountOut = baseUnitsToDecimal(order.outAmount, toToken.decimals);

  if (estimatedAmountOut <= 0) {
    return "No route for this pair and amount right now.";
  }

  if (
    typeof order.outUsdValue === "number" &&
    Number.isFinite(order.outUsdValue) &&
    order.outUsdValue < MINIMUM_USEFUL_QUOTE_USD
  ) {
    return "Amount is too small for a useful quote on this pair.";
  }

  return null;
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
    provider: "Jupiter Ultra",
    requestId: order.requestId,
    routeFeePct: order.feeBps / 100,
    routeLabel:
      routeLabels.join(" + ") || `Router ${order.router.toUpperCase()}`,
    slippageBps: order.slippageBps,
  };
}
