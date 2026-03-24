"use client";

import { useEffect, useMemo, useState } from "react";
import { type TokenConfig } from "@/lib/tokens";

type JupiterTokenSearchItem = {
  logoUri?: string | null;
  mint?: string;
};

const logoCache = new Map<string, string | null>();
const pendingLogoRequests = new Map<string, Promise<string | null>>();

async function fetchSceneLogo(mint: string) {
  const pending = pendingLogoRequests.get(mint);

  if (pending) {
    return pending;
  }

  const params = new URLSearchParams({ query: mint });
  const request = fetch(`/api/jupiter/tokens?${params.toString()}`, {
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as unknown;

      if (!Array.isArray(data)) {
        return null;
      }

      const items = data as JupiterTokenSearchItem[];
      const match = items.find((item) => item.mint === mint) ?? items[0];
      return match?.logoUri?.trim() || null;
    })
    .finally(() => {
      pendingLogoRequests.delete(mint);
    });

  pendingLogoRequests.set(mint, request);
  return request;
}

export function useResolvedSceneTokens(tokens: TokenConfig[]) {
  const [resolvedLogos, setResolvedLogos] = useState<Record<string, string | null>>(() =>
    tokens.reduce(
      (accumulator, token) => {
        const cached = logoCache.get(token.mint);

        if (cached !== undefined) {
          accumulator[token.mint] = cached;
        }

        return accumulator;
      },
      {} as Record<string, string | null>,
    ),
  );

  useEffect(() => {
    let active = true;
    const missingMints = Array.from(new Set(tokens.map((token) => token.mint))).filter(
      (mint) => !logoCache.has(mint),
    );

    if (missingMints.length === 0) {
      return;
    }

    void Promise.all(
      missingMints.map(async (mint) => {
        try {
          const logoUri = await fetchSceneLogo(mint);
          logoCache.set(mint, logoUri);
          return [mint, logoUri] as const;
        } catch {
          logoCache.set(mint, null);
          return [mint, null] as const;
        }
      }),
    ).then((entries) => {
      if (!active || entries.length === 0) {
        return;
      }

      setResolvedLogos((current) => {
        const next = { ...current };

        for (const [mint, logoUri] of entries) {
          next[mint] = logoUri;
        }

        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [tokens]);

  return useMemo(
    () =>
      tokens.map((token) => ({
        ...token,
        logoUri: resolvedLogos[token.mint] ?? token.logoUri ?? null,
      })),
    [resolvedLogos, tokens],
  );
}
