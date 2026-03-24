import { NextResponse } from "next/server";
import { jupiterFetch } from "@/lib/jupiter-server";
import {
  toOrderResponse,
  type JupiterOrderResponse,
  type JupiterSwapBuildResponse,
  type JupiterSwapQuoteResponse,
} from "@/lib/jupiter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inputMint = searchParams.get("inputMint")?.trim();
    const outputMint = searchParams.get("outputMint")?.trim();
    const amount = searchParams.get("amount")?.trim();
    const slippageBps = searchParams.get("slippageBps")?.trim();
    const taker = searchParams.get("taker")?.trim();

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: "inputMint, outputMint, and amount are required." },
        { status: 400 },
      );
    }

    const upstreamParams = new URLSearchParams({
      amount,
      inputMint,
      outputMint,
    });

    if (slippageBps) {
      upstreamParams.set("slippageBps", slippageBps);
    }

    if (taker) {
      upstreamParams.set("taker", taker);
    }

    const quote = await jupiterFetch<JupiterSwapQuoteResponse>(
      `/quote?${upstreamParams.toString()}`,
      undefined,
      { kind: "swap" },
    );

    if (!taker) {
      return NextResponse.json(
        toOrderResponse(quote, null, crypto.randomUUID()),
      );
    }

    const swap = await jupiterFetch<JupiterSwapBuildResponse>(
      "/swap",
      {
        body: JSON.stringify({
          dynamicComputeUnitLimit: true,
          dynamicSlippage: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: 1_000_000,
              priorityLevel: "veryHigh",
            },
          },
          quoteResponse: quote,
          userPublicKey: taker,
        }),
        method: "POST",
      },
      { kind: "swap" },
    );

    return NextResponse.json(
      toOrderResponse(
        quote,
        swap.swapTransaction,
        crypto.randomUUID(),
        swap.lastValidBlockHeight,
        swap.simulationError,
      ) satisfies JupiterOrderResponse,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to fetch Jupiter order.",
      },
      { status: 500 },
    );
  }
}
