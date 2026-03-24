import "server-only";

const DEFAULT_JUPITER_ULTRA_API_BASE_URL = "https://api.jup.ag/ultra/v1";

function getJupiterApiKey() {
  return process.env.JUP_API_KEY?.trim() || null;
}

function getJupiterApiBaseUrl() {
  return (
    process.env.JUP_ULTRA_API_BASE_URL?.trim().replace(/\/$/, "") ||
    process.env.JUP_API_BASE_URL?.trim().replace(/\/$/, "") ||
    DEFAULT_JUPITER_ULTRA_API_BASE_URL
  );
}

export async function jupiterFetch<T>(
  path: string,
  init?: RequestInit,
  options?: {
    requireApiKey?: boolean;
  },
): Promise<T> {
  const apiKey = getJupiterApiKey();

  if (options?.requireApiKey && !apiKey) {
    throw new Error("Missing JUP_API_KEY.");
  }

  const response = await fetch(`${getJupiterApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json().catch(() => null)) as T | {
    error?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    const message =
      (data &&
        typeof data === "object" &&
        ("error" in data || "message" in data) &&
        (data.error || data.message)) ||
      `Jupiter request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return data as T;
}
