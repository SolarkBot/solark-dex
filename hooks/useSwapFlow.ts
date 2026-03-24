"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type JupiterExecuteResponse,
  normalizeOrderToQuote,
  type JupiterOrderResponse,
} from "@/lib/jupiter";
import {
  LIVE_SWAP_SCENE_DURATIONS,
  getSwapFlowLabel,
  type MockSwapResult,
  type SwapFlowPhase,
  type SwapQuote,
} from "@/lib/mockSwap";
import {
  isValidMintAddress,
  resolveTokenConfig,
} from "@/lib/solana";
import {
  PRESET_TOKEN_BY_SYMBOL,
  PRESET_TOKENS,
  amountToBaseUnits,
  formatTokenAmount,
  getTokenDisplaySymbol,
  type TokenConfig,
} from "@/lib/tokens";

const TIMELINE = {
  locatingAgents: 380,
  approaching: 1180,
  ready: 2050,
} as const;

const DEFAULT_SLIPPAGE_BPS = 50;
const QUOTE_DEBOUNCE_MS = 350;

export const CUSTOM_TOKEN_OPTION = "__custom__";

function clearTimers(timeouts: number[]) {
  timeouts.forEach((timeout) => window.clearTimeout(timeout));
}

function upsertSessionToken(tokens: TokenConfig[], nextToken: TokenConfig) {
  if (tokens.some((token) => token.mint === nextToken.mint)) {
    return tokens;
  }

  return [...tokens, nextToken];
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    const message =
      (data &&
        typeof data === "object" &&
        ("error" in data || "message" in data) &&
        (data.error || data.message)) ||
      "Request failed.";

    throw new Error(message);
  }

  return data as T;
}

function getReadyStatus(
  connected: boolean,
  amount: string,
  fromToken: TokenConfig,
  toToken: TokenConfig,
) {
  return connected
    ? `Live route ready. Confirm ${amount} ${fromToken.symbol} for ${toToken.symbol}.`
    : `Live route ready. Connect wallet to swap ${amount} ${fromToken.symbol}.`;
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64(value: Uint8Array) {
  let binary = "";

  for (let index = 0; index < value.length; index += 0x8000) {
    const chunk = value.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

export function useSwapFlow() {
  const { connection } = useConnection();
  const { connected, publicKey, signTransaction } = useWallet();
  const [availableTokens, setAvailableTokens] = useState<TokenConfig[]>(PRESET_TOKENS);
  const [fromToken, setFromToken] = useState<TokenConfig>(PRESET_TOKEN_BY_SYMBOL.SOL);
  const [toToken, setToToken] = useState<TokenConfig>(PRESET_TOKEN_BY_SYMBOL.USDC);
  const [fromCustomInput, setFromCustomInput] = useState("");
  const [toCustomInput, setToCustomInput] = useState("");
  const [showFromCustomInput, setShowFromCustomInput] = useState(false);
  const [showToCustomInput, setShowToCustomInput] = useState(false);
  const [resolvingFromCustom, setResolvingFromCustom] = useState(false);
  const [resolvingToCustom, setResolvingToCustom] = useState(false);
  const [amount, setAmountState] = useState("");
  const [phase, setPhase] = useState<SwapFlowPhase>("idle");
  const [status, setStatus] = useState("Choose a pair and amount to call two roaming desks.");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<MockSwapResult | null>(null);
  const [sequenceId, setSequenceId] = useState(0);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const quoteRef = useRef<SwapQuote | null>(null);
  const phaseRef = useRef<SwapFlowPhase>("idle");
  const phaseTimersRef = useRef<number[]>([]);
  const quoteRequestRef = useRef(0);
  const executionRef = useRef(0);

  const numericAmount = Number(amount);
  const hasAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const validPair = fromToken.mint !== toToken.mint;
  const resolvingCustom = resolvingFromCustom || resolvingToCustom;
  const walletAddress = publicKey?.toBase58() ?? null;
  const amountInBaseUnits = useMemo(
    () => amountToBaseUnits(amount, fromToken.decimals),
    [amount, fromToken.decimals],
  );
  const canSwap =
    connected &&
    phase === "ready" &&
    validPair &&
    hasAmount &&
    !resolvingCustom &&
    !quoteLoading &&
    !!quote;

  useEffect(() => {
    quoteRef.current = quote;
  }, [quote]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const resetJourney = useCallback(() => {
    clearTimers(phaseTimersRef.current);
    phaseTimersRef.current = [];
    quoteRequestRef.current += 1;
    executionRef.current += 1;
    setError(null);
    setReceipt(null);
    setQuote(null);
    setQuoteLoading(false);
  }, []);

  useEffect(() => () => clearTimers(phaseTimersRef.current), []);

  useEffect(() => {
    clearTimers(phaseTimersRef.current);
    phaseTimersRef.current = [];
    setError(null);
    setReceipt(null);

    if (resolvingCustom) {
      setQuote(null);
      setQuoteLoading(false);
      setPhase("tokenSelection");
      setStatus("Resolving custom contract address.");
      return;
    }

    if (!validPair) {
      setQuote(null);
      setQuoteLoading(false);
      setPhase("error");
      setStatus("Choose two different token desks.");
      setError("Source and destination agents must be different.");
      return;
    }

    if (!amount.trim()) {
      setQuote(null);
      setQuoteLoading(false);
      setPhase("idle");
      setStatus("Pick a route and enter an amount to wake the market.");
      return;
    }

    if (!hasAmount) {
      setQuote(null);
      setQuoteLoading(false);
      setPhase("error");
      setStatus("Amount is invalid.");
      setError("Enter an amount greater than zero.");
      return;
    }

    const requestId = ++quoteRequestRef.current;

    setPhase("tokenSelection");
    setStatus(`${fromToken.symbol} and ${toToken.symbol} agents acknowledge the request.`);

    phaseTimersRef.current.push(
      window.setTimeout(() => {
        if (quoteRequestRef.current !== requestId) {
          return;
        }

        setPhase("locatingAgents");
        setStatus(`Scanning Jupiter lanes for ${fromToken.symbol} -> ${toToken.symbol}.`);
      }, TIMELINE.locatingAgents),
    );

    phaseTimersRef.current.push(
      window.setTimeout(() => {
        if (quoteRequestRef.current !== requestId) {
          return;
        }

        setPhase("approaching");
        setStatus("Agents are in lane. Waiting for a live Jupiter route.");
      }, TIMELINE.approaching),
    );

    phaseTimersRef.current.push(
      window.setTimeout(() => {
        if (quoteRequestRef.current !== requestId) {
          return;
        }

        if (quoteRef.current) {
          setPhase("ready");
          setStatus(getReadyStatus(connected, amount, fromToken, toToken));
          return;
        }

        setPhase("approaching");
        setStatus("Route request still settling through Jupiter.");
      }, TIMELINE.ready),
    );

    return () => {
      clearTimers(phaseTimersRef.current);
      phaseTimersRef.current = [];
    };
  }, [amount, connected, fromToken, hasAmount, resolvingCustom, toToken, validPair]);

  useEffect(() => {
    if (!amountInBaseUnits || !validPair || !hasAmount || resolvingCustom) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }

    const requestId = quoteRequestRef.current;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setQuoteLoading(true);
        const params = new URLSearchParams({
          amount: amountInBaseUnits,
          inputMint: fromToken.mint,
          outputMint: toToken.mint,
          slippageBps: String(DEFAULT_SLIPPAGE_BPS),
        });
        const order = await fetchJson<JupiterOrderResponse>(
          `/api/jupiter/order?${params.toString()}`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted || quoteRequestRef.current !== requestId) {
          return;
        }

        const nextQuote = normalizeOrderToQuote(order, fromToken, toToken, numericAmount);
        setQuote(nextQuote);
        setError(null);

        if (
          phaseRef.current === "tokenSelection" ||
          phaseRef.current === "locatingAgents" ||
          phaseRef.current === "approaching" ||
          phaseRef.current === "ready"
        ) {
          setPhase("ready");
          setStatus(getReadyStatus(connected, amount, fromToken, toToken));
        }
      } catch (caughtError) {
        if (controller.signal.aborted || quoteRequestRef.current !== requestId) {
          return;
        }

        setQuote(null);
        setPhase("error");
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to fetch a Jupiter route.",
        );
        setStatus("Live route request failed.");
      } finally {
        if (!controller.signal.aborted && quoteRequestRef.current === requestId) {
          setQuoteLoading(false);
        }
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    amount,
    amountInBaseUnits,
    connected,
    fromToken,
    hasAmount,
    numericAmount,
    resolvingCustom,
    toToken,
    validPair,
  ]);

  const selectToken = useCallback((side: "from" | "to", tokenMint: string) => {
    if (tokenMint === CUSTOM_TOKEN_OPTION) {
      if (side === "from") {
        setShowFromCustomInput(true);
      } else {
        setShowToCustomInput(true);
      }
      return;
    }

    const nextToken = availableTokens.find((token) => token.mint === tokenMint);

    if (!nextToken) {
      return;
    }

    resetJourney();

    if (side === "from") {
      setFromToken(nextToken);
      setShowFromCustomInput(false);
      setFromCustomInput("");
    } else {
      setToToken(nextToken);
      setShowToCustomInput(false);
      setToCustomInput("");
    }

    setSequenceId((current) => current + 1);
  }, [availableTokens, resetJourney]);

  const resolveCustomToken = useCallback(async (side: "from" | "to") => {
    const mint = (side === "from" ? fromCustomInput : toCustomInput).trim();

    if (!mint) {
      setError("Paste a token mint address first.");
      setStatus("Paste a custom contract address to resolve the token.");
      return;
    }

    if (!isValidMintAddress(mint)) {
      setError("That mint address is not a valid Solana public key.");
      setStatus("Custom token lookup failed.");
      return;
    }

    resetJourney();
    setStatus("Resolving custom contract address.");

    if (side === "from") {
      setResolvingFromCustom(true);
    } else {
      setResolvingToCustom(true);
    }

    try {
      const resolvedToken = await resolveTokenConfig(connection, mint);

      setAvailableTokens((currentTokens) =>
        upsertSessionToken(currentTokens, resolvedToken),
      );

      if (side === "from") {
        setFromToken(resolvedToken);
        setShowFromCustomInput(false);
        setFromCustomInput("");
      } else {
        setToToken(resolvedToken);
        setShowToCustomInput(false);
        setToCustomInput("");
      }

      setSequenceId((current) => current + 1);
      setStatus(`${getTokenDisplaySymbol(resolvedToken)} desk joined the market.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to resolve that custom contract address.",
      );
      setStatus("Custom token lookup failed.");
    } finally {
      if (side === "from") {
        setResolvingFromCustom(false);
      } else {
        setResolvingToCustom(false);
      }
    }
  }, [connection, fromCustomInput, resetJourney, toCustomInput]);

  const beginSwap = useCallback(async () => {
    if (!connected || !publicKey || !walletAddress) {
      setPhase("error");
      setError("Connect Phantom or Solflare to execute the route.");
      setStatus("Wallet connection required.");
      return;
    }

    if (!signTransaction) {
      setPhase("error");
      setError("The connected wallet does not support transaction signing.");
      setStatus("Wallet signature unavailable.");
      return;
    }

    if (!quote || !amountInBaseUnits || !hasAmount || !validPair) {
      setPhase("error");
      setError("Enter a valid amount to generate a live route.");
      setStatus("Quote unavailable.");
      return;
    }

    const executionId = Date.now();
    executionRef.current = executionId;

    try {
      clearTimers(phaseTimersRef.current);
      phaseTimersRef.current = [];
      setError(null);
      setReceipt(null);
      setPhase("signing");
      setStatus("Approve the live Jupiter swap in your wallet.");
      setSequenceId((current) => current + 1);

      const orderParams = new URLSearchParams({
        amount: amountInBaseUnits,
        inputMint: fromToken.mint,
        outputMint: toToken.mint,
        slippageBps: String(DEFAULT_SLIPPAGE_BPS),
        taker: walletAddress,
      });
      const order = await fetchJson<JupiterOrderResponse>(
        `/api/jupiter/order?${orderParams.toString()}`,
      );

      if (executionRef.current !== executionId) {
        return;
      }

      if (order.errorCode || !order.transaction) {
        throw new Error(
          order.errorMessage || "Jupiter did not return a signable transaction.",
        );
      }

      const liveQuote = normalizeOrderToQuote(order, fromToken, toToken, numericAmount);
      setQuote(liveQuote);

      const unsignedTransaction = VersionedTransaction.deserialize(
        base64ToBytes(order.transaction),
      );
      const signedTransaction = await signTransaction(unsignedTransaction);
      const signedTransactionBase64 = bytesToBase64(signedTransaction.serialize());

      if (executionRef.current !== executionId) {
        return;
      }

      setPhase("confirming");
      setStatus("Submitting signed swap through Jupiter.");

      const execution = await fetchJson<JupiterExecuteResponse>(
        "/api/jupiter/execute",
        {
          body: JSON.stringify({
            requestId: order.requestId,
            signedTransaction: signedTransactionBase64,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );

      if (executionRef.current !== executionId) {
        return;
      }

      if (execution.status !== "Success") {
        throw new Error(execution.error || "Jupiter could not settle the signed swap.");
      }

      const outputBaseUnits =
        execution.outputAmountResult ||
        execution.totalOutputAmount ||
        order.outAmount;
      const receivedAmount = outputBaseUnits
        ? Number.isFinite(Number(outputBaseUnits))
          ? Number(outputBaseUnits) / 10 ** toToken.decimals
          : liveQuote.estimatedAmountOut
        : liveQuote.estimatedAmountOut;

      const nextReceipt: MockSwapResult = {
        amountIn: numericAmount,
        amountOut: receivedAmount,
        originalAmountLabel: formatTokenAmount(numericAmount, fromToken),
        receivedLabel: formatTokenAmount(receivedAmount, toToken),
        fromToken,
        routeLabel: liveQuote.routeLabel,
        signature: execution.signature || order.requestId,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        toToken,
      };

      clearTimers(phaseTimersRef.current);
      phaseTimersRef.current = [];
      setPhase("settled");
      setStatus("Swap confirmed on-chain. Cargos exchanged.");

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          if (executionRef.current !== executionId) {
            return;
          }

          setPhase("departing");
          setStatus("Swap confirmed. Agents leaving the board.");
        }, LIVE_SWAP_SCENE_DURATIONS.settledHold),
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          if (executionRef.current !== executionId) {
            return;
          }

          setReceipt(nextReceipt);
          setPhase("success");
          setStatus(
            `Trade settled. Bought ${nextReceipt.receivedLabel} with ${nextReceipt.originalAmountLabel}.`,
          );
        }, LIVE_SWAP_SCENE_DURATIONS.settledHold + LIVE_SWAP_SCENE_DURATIONS.departing),
      );
    } catch (caughtError) {
      if (executionRef.current !== executionId) {
        return;
      }

      clearTimers(phaseTimersRef.current);
      phaseTimersRef.current = [];
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Live Jupiter swap failed.",
      );
      setPhase("recovering");
      setStatus("Swap failed. Agents reclaiming their original cargo.");

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          if (executionRef.current !== executionId) {
            return;
          }

          if (quoteRef.current) {
            setError(null);
            setPhase("ready");
            setStatus(getReadyStatus(connected, amount, fromToken, toToken));
            return;
          }

          setPhase("error");
          setStatus("Swap failed. Agents returned to roaming.");
        }, LIVE_SWAP_SCENE_DURATIONS.recovering),
      );
    }
  }, [
    amountInBaseUnits,
    connected,
    connection,
    fromToken,
    hasAmount,
    numericAmount,
    publicKey,
    quote,
    signTransaction,
    toToken,
    validPair,
    walletAddress,
    amount,
  ]);

  const selectedMints = useMemo(() => {
    if (!validPair) {
      return [];
    }

    return [fromToken.mint, toToken.mint].filter(
      (mint, index, list) => list.indexOf(mint) === index,
    );
  }, [fromToken.mint, toToken.mint, validPair]);

  return {
    amount,
    availableTokens,
    beginSwap,
    canSwap,
    error,
    fromCustomInput,
    fromToken,
    phase,
    phaseLabel: getSwapFlowLabel(phase),
    quote,
    quoteLoading,
    receipt,
    resolveFromCustom: () => resolveCustomToken("from"),
    resolveToCustom: () => resolveCustomToken("to"),
    resolvingFromCustom,
    resolvingToCustom,
    selectedMints,
    sequenceId,
    setAmount: (nextAmount: string) => {
      resetJourney();
      setAmountState(nextAmount);
    },
    setFromCustomInput,
    setToCustomInput,
    showFromCustomInput,
    showToCustomInput,
    status,
    toCustomInput,
    toToken,
    onFromTokenChange: (value: string) => selectToken("from", value),
    onToTokenChange: (value: string) => selectToken("to", value),
  };
}
