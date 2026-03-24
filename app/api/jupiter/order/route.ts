import { NextResponse } from "next/server";
import { jupiterFetch } from "@/lib/jupiter-server";
import { type JupiterOrderResponse } from "@/lib/jupiter";

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

    const order = await jupiterFetch<JupiterOrderResponse>(
      `/order?${upstreamParams.toString()}`,
      undefined,
      { requireApiKey: true },
    );

    return NextResponse.json(order);
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
