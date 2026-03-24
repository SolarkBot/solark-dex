import { NextResponse } from "next/server";
import { type JupiterExecuteResponse } from "@/lib/jupiter";
import { jupiterFetch } from "@/lib/jupiter-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          requestId?: string;
          signedTransaction?: string;
        }
      | null;

    const requestId = body?.requestId?.trim();
    const signedTransaction = body?.signedTransaction?.trim();

    if (!requestId || !signedTransaction) {
      return NextResponse.json(
        { error: "requestId and signedTransaction are required." },
        { status: 400 },
      );
    }

    const execution = await jupiterFetch<JupiterExecuteResponse>(
      "/execute",
      {
        body: JSON.stringify({
          requestId,
          signedTransaction,
        }),
        method: "POST",
      },
      { requireApiKey: true },
    );

    return NextResponse.json(execution);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to execute Jupiter swap.",
      },
      { status: 500 },
    );
  }
}
