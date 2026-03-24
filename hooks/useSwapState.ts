"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeOrderToQuote,
  type JupiterExecuteResponse,
  type JupiterOrderResponse,
} from "@/lib/jupiter";
import {
  getSwapProgress,
  isSwapBusy,
  type PreparedSwap,
  type SwapPhase,
  type SwapReceipt,
} from "@/lib/mockSwap";
import {
  PRESET_TOKEN_BY_SYMBOL,
  amountToBaseUnits,
  getAlternatePresetToken,
  getTokenDisplaySymbol,
  type TokenConfig,
} from "@/lib/tokens";
import {
  getEmptyWalletBalances,
  getWalletBalances,
  isValidMintAddress,
  resolveTokenConfig,
} from "@/lib/solana";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

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

export function useSwapState() {
  const { connection } = useConnection();
  const { connected, publicKey, signTransaction } = useWallet();
  const [fromToken, setFromTokenState] = useState<TokenConfig>(
    PRESET_TOKEN_BY_SYMBOL.SOL,
  );
  const [toToken, setToTokenState] = useState<TokenConfig>(
    PRESET_TOKEN_BY_SYMBOL.SOLBOT,
  );
  const [fromMintInput, setFromMintInput] = useState("");
  const [toMintInput, setToMintInput] = useState("");
  const [resolvingFromMint, setResolvingFromMint] = useState(false);
  const [resolvingToMint, setResolvingToMint] = useState(false);
  const [amount, setAmount] = useState("5");
  const [slippageBps, setSlippageBps] = useState(50);
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [status, setStatus] = useState(
    "Connect a wallet to request a live Jupiter route.",
  );
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [activeSwap, setActiveSwap] = useState<PreparedSwap | null>(null);
  const [lastReceipt, setLastReceipt] = useState<SwapReceipt | null>(null);
  const [quote, setQuote] = useState<PreparedSwap["quote"] | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [quoteLoading, setQuoteLoading] = useState(false);
  const executionRef = useRef(0);

  const numericAmount = Number(amount);
  const walletAddress = publicKey?.toBase58() ?? null;
  const amountInBaseUnits = useMemo(
    () => amountToBaseUnits(amount, fromToken.decimals),
    [amount, fromToken.decimals],
  );
  const busy = isSwapBusy(phase);
  const progress = getSwapProgress(phase);
  const trackedTokens = useMemo(() => {
    return Array.from(
      new Map(
        [fromToken, toToken, activeSwap?.fromToken, activeSwap?.toToken, lastReceipt?.toToken]
          .filter((token): token is TokenConfig => Boolean(token))
          .map((token) => [token.mint, token]),
      ).values(),
    );
  }, [activeSwap, fromToken, lastReceipt, toToken]);

  const canSwap =
    connected &&
    !busy &&
    !quoteLoading &&
    !resolvingFromMint &&
    !resolvingToMint &&
    !!quote &&
    numericAmount > 0 &&
    numericAmount <= (balances[fromToken.mint] ?? 0) &&
    fromToken.mint !== toToken.mint;

  const resetFlow = useCallback(() => {
    setError(null);
    setPhase("idle");
    setActiveSwap(null);
    setLastReceipt(null);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) {
      setBalances(getEmptyWalletBalances(trackedTokens));
      return;
    }

    const nextBalances = await getWalletBalances(connection, publicKey, trackedTokens);
    setError(null);
    setBalances(nextBalances);
  }, [connection, publicKey, trackedTokens]);

  useEffect(() => {
    if (!publicKey) {
      setBalances(getEmptyWalletBalances(trackedTokens));
      return;
    }

    void refreshBalances().catch((caughtError) => {
      setBalances(getEmptyWalletBalances(trackedTokens));
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to refresh wallet balances.",
      );
    });
  }, [publicKey, refreshBalances, trackedTokens]);

  useEffect(() => {
    if (busy) {
      return;
    }

    if (phase === "success" || phase === "error") {
      return;
    }

    if (!amount.trim()) {
      setStatus("Enter an amount to request a live Jupiter route.");
      return;
    }

    if (resolvingFromMint || resolvingToMint) {
      setStatus("Resolving pasted mint address.");
      return;
    }

    if (!connected) {
      setStatus(
        quote
          ? "Route ready. Connect Phantom to execute it."
          : "Connect Phantom to request and execute Jupiter routes.",
      );
      return;
    }

    if (quoteLoading) {
      setStatus("Requesting a live Jupiter swap route.");
      return;
    }

    if (quote) {
      setStatus("Live Jupiter route ready. Sign when you are.");
      return;
    }

    setStatus("Adjust the pair, amount, or pasted mint to request a Jupiter route.");
  }, [
    amount,
    busy,
    connected,
    phase,
    quote,
    quoteLoading,
    resolvingFromMint,
    resolvingToMint,
  ]);

  useEffect(() => {
    if (!amountInBaseUnits || fromToken.mint === toToken.mint || numericAmount <= 0) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setQuoteLoading(true);

        const params = new URLSearchParams({
          amount: amountInBaseUnits,
          inputMint: fromToken.mint,
          outputMint: toToken.mint,
          slippageBps: String(slippageBps),
        });
        const order = await fetchJson<JupiterOrderResponse>(
          `/api/jupiter/order?${params.toString()}`,
          { signal: controller.signal },
        );

        setError(null);
        setQuote(normalizeOrderToQuote(order, fromToken, toToken, numericAmount));
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        setQuote(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to fetch a Jupiter route.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setQuoteLoading(false);
        }
      }
    }, 650);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [amountInBaseUnits, fromToken, numericAmount, slippageBps, toToken]);

  const setFromToken = useCallback((nextToken: TokenConfig) => {
    resetFlow();
    setFromTokenState(nextToken);
    setFromMintInput(nextToken.isPreset ? "" : nextToken.mint);
    setToTokenState((currentToken) =>
      currentToken.mint === nextToken.mint
        ? getAlternatePresetToken(nextToken.mint)
        : currentToken,
    );
  }, [resetFlow]);

  const setToToken = useCallback((nextToken: TokenConfig) => {
    resetFlow();
    setToTokenState(nextToken);
    setToMintInput(nextToken.isPreset ? "" : nextToken.mint);
    setFromTokenState((currentToken) =>
      currentToken.mint === nextToken.mint
        ? getAlternatePresetToken(nextToken.mint)
        : currentToken,
    );
  }, [resetFlow]);

  const setPresetFromToken = useCallback((symbol: string) => {
    const nextToken = PRESET_TOKEN_BY_SYMBOL[symbol];

    if (nextToken) {
      setFromToken(nextToken);
    }
  }, [setFromToken]);

  const setPresetToToken = useCallback((symbol: string) => {
    const nextToken = PRESET_TOKEN_BY_SYMBOL[symbol];

    if (nextToken) {
      setToToken(nextToken);
    }
  }, [setToToken]);

  const swapTokens = useCallback(() => {
    resetFlow();
    setFromTokenState(toToken);
    setToTokenState(fromToken);
    setFromMintInput(toToken.isPreset ? "" : toToken.mint);
    setToMintInput(fromToken.isPreset ? "" : fromToken.mint);
  }, [fromToken, resetFlow, toToken]);

  const resolveMintForSide = useCallback(async (
    side: "from" | "to",
    explicitMint?: string,
  ) => {
    const mint = (explicitMint ?? (side === "from" ? fromMintInput : toMintInput)).trim();

    if (!mint) {
      setError("Paste a token mint address first.");
      return;
    }

    if (!isValidMintAddress(mint)) {
      setError("That mint address is not a valid Solana public key.");
      return;
    }

    resetFlow();
    setError(null);
    setStatus("Resolving pasted mint address.");

    if (side === "from") {
      setFromMintInput(mint);
    } else {
      setToMintInput(mint);
    }

    try {
      if (side === "from") {
        setResolvingFromMint(true);
      } else {
        setResolvingToMint(true);
      }

      const resolvedToken = await resolveTokenConfig(connection, mint);

      if (side === "from") {
        setFromToken(resolvedToken);
      } else {
        setToToken(resolvedToken);
      }

      setStatus(
        `${getTokenDisplaySymbol(resolvedToken)} loaded. Requesting a Jupiter route if the token is tradable.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to resolve that mint address.",
      );
    } finally {
      if (side === "from") {
        setResolvingFromMint(false);
      } else {
        setResolvingToMint(false);
      }
    }
  }, [
    connection,
    fromMintInput,
    resetFlow,
    setFromToken,
    setToToken,
    toMintInput,
  ]);

  const handleAmountChange = useCallback((value: string) => {
    resetFlow();
    setAmount(value);
  }, [resetFlow]);

  const handleSlippageChange = useCallback((value: number) => {
    resetFlow();
    setSlippageBps(value);
  }, [resetFlow]);

  const executeSwap = useCallback(async () => {
    if (!connected || !publicKey || !walletAddress) {
      setPhase("error");
      setError("Connect Phantom to execute the route.");
      setStatus("Wallet connection required.");
      return;
    }

    if (!signTransaction) {
      setPhase("error");
      setError("The connected wallet does not support transaction signing.");
      setStatus("Wallet signature unavailable.");
      return;
    }

    if (
      !quote ||
      !amountInBaseUnits ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setPhase("error");
      setError("Enter a valid amount to generate a route.");
      setStatus("Quote unavailable.");
      return;
    }

    if (numericAmount > (balances[fromToken.mint] ?? 0)) {
      setPhase("error");
      setError(`Insufficient ${getTokenDisplaySymbol(fromToken)} balance in the connected wallet.`);
      setStatus("Balance check failed.");
      return;
    }

    const executionId = Date.now();
    executionRef.current = executionId;

    try {
      const orderParams = new URLSearchParams({
        amount: amountInBaseUnits,
        inputMint: fromToken.mint,
        outputMint: toToken.mint,
        slippageBps: String(slippageBps),
        taker: walletAddress,
      });
      const order = await fetchJson<JupiterOrderResponse>(
        `/api/jupiter/order?${orderParams.toString()}`,
      );

      if (order.errorCode || !order.transaction) {
        throw new Error(
          order.errorMessage || "Jupiter did not return a signable transaction.",
        );
      }

      const preparedSwap: PreparedSwap = {
        amountIn: numericAmount,
        fromToken,
        quote: normalizeOrderToQuote(order, fromToken, toToken, numericAmount),
        toToken,
        walletAddress,
      };

      setRunId((current) => current + 1);
      setError(null);
      setLastReceipt(null);
      setActiveSwap(preparedSwap);
      setQuote(preparedSwap.quote);
      setPhase("preparing");
      setStatus("Locking the Jupiter route and preparing signature payload.");

      await sleep(700);
      if (executionRef.current !== executionId) {
        return;
      }

      const unsignedTransaction = VersionedTransaction.deserialize(
        base64ToBytes(order.transaction),
      );
      const signedTransaction = await signTransaction(unsignedTransaction);
      const signedTransactionBase64 = bytesToBase64(signedTransaction.serialize());

      setPhase("approach");
      setStatus("Signature captured. Sending execution back to Jupiter.");

      await sleep(450);
      if (executionRef.current !== executionId) {
        return;
      }

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

      if (execution.status !== "Success") {
        throw new Error(execution.error || "The signed swap could not be settled.");
      }

      setPhase("exchange");
      setStatus("Jupiter is confirming the signed swap.");

      await sleep(900);
      if (executionRef.current !== executionId) {
        return;
      }

      const receipt: SwapReceipt = {
        executedAt: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        outputAmount:
          execution.outputAmountResult &&
          Number.isFinite(Number(execution.outputAmountResult))
            ? Number(execution.outputAmountResult) / 10 ** preparedSwap.toToken.decimals
            : preparedSwap.quote.estimatedAmountOut,
        priceImpactPct: preparedSwap.quote.priceImpactPct,
        signature: execution.signature || order.requestId,
        toToken: preparedSwap.toToken,
      };

      setLastReceipt(receipt);
      setPhase("return");
      setStatus("Execution confirmed. Finalizing settlement state.");

      await sleep(1200);
      if (executionRef.current !== executionId) {
        return;
      }

      await refreshBalances();
      setPhase("success");
      setStatus(
        `Swap complete: ${receipt.outputAmount} ${getTokenDisplaySymbol(receipt.toToken)} received for ${preparedSwap.amountIn} ${getTokenDisplaySymbol(preparedSwap.fromToken)}.`,
      );
    } catch (caughtError) {
      if (executionRef.current !== executionId) {
        return;
      }

      setPhase("error");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unexpected Jupiter swap failure.",
      );
      setStatus("Swap execution failed.");
    }
  }, [
    amountInBaseUnits,
    balances,
    connected,
    connection,
    fromToken,
    numericAmount,
    publicKey,
    quote,
    refreshBalances,
    signTransaction,
    slippageBps,
    toToken,
    walletAddress,
  ]);

  return {
    activeSwap,
    amount,
    balances,
    canSwap,
    error,
    executeSwap,
    fromMintInput,
    fromToken,
    lastReceipt,
    phase,
    progress,
    quote,
    quoteLoading,
    resolveFromMint: (mint?: string) => resolveMintForSide("from", mint),
    resolveToMint: (mint?: string) => resolveMintForSide("to", mint),
    resolvingFromMint,
    resolvingToMint,
    runId,
    setAmount: handleAmountChange,
    setFromMintInput,
    setPresetFromToken,
    setPresetToToken,
    setSlippageBps: handleSlippageChange,
    setToMintInput,
    slippageBps,
    status,
    swapTokens,
    toMintInput,
    toToken,
    walletAddress,
    walletConnected: connected,
    working: busy,
  };
}
