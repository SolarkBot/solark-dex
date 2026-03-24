import { NextResponse } from "next/server";
import { PRESET_TOKENS } from "@/lib/tokens";

const JUPITER_TOKEN_SEARCH_URL = "https://lite-api.jup.ag/tokens/v2/search";

type JupiterTokenSearchItem = {
  decimals?: number;
  icon?: string | null;
  id?: string;
  name?: string;
  symbol?: string;
};

function normalizeToken(item: {
  decimals?: number;
  icon?: string | null;
  mint: string;
  name: string;
  symbol: string;
}) {
  return {
    decimals: Number.isFinite(item.decimals) ? item.decimals : null,
    logoUri: item.icon?.trim() || null,
    mint: item.mint,
    name: item.name,
    symbol: item.symbol,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json(
        PRESET_TOKENS.map((token) =>
          normalizeToken({
            decimals: token.decimals,
            icon: token.logoUri,
            mint: token.mint,
            name: token.name,
            symbol: token.symbol,
          }),
        ),
      );
    }

    const params = new URLSearchParams({ query });
    const response = await fetch(`${JUPITER_TOKEN_SEARCH_URL}?${params.toString()}`, {
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (data &&
              typeof data === "object" &&
              "message" in data &&
              typeof data.message === "string" &&
              data.message) ||
            "Unable to search Jupiter tokens.",
        },
        { status: response.status },
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json([]);
    }

    const tokens = data
      .map((item) => item as JupiterTokenSearchItem)
      .filter((item) => item.id && item.symbol && item.name)
      .slice(0, 12)
      .map((item) =>
        normalizeToken({
          decimals: item.decimals,
          icon: item.icon,
          mint: item.id as string,
          name: item.name as string,
          symbol: item.symbol as string,
        }),
      );

    return NextResponse.json(tokens);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to search Jupiter tokens.",
      },
      { status: 500 },
    );
  }
}
