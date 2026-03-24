import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "Missing src parameter." }, { status: 400 });
  }

  let parsed: URL;

  try {
    parsed = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid src parameter." }, { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Unsupported logo protocol." }, { status: 400 });
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(parsed.toString(), {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      next: { revalidate: 60 * 60 * 24 },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch logo." }, { status: 502 });
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json({ error: "Upstream logo request failed." }, { status: 502 });
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "image/png";
  const buffer = await upstreamResponse.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": contentType,
    },
    status: 200,
  });
}
