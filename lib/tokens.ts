export type AssetKind = "crate" | "duffel" | "suitcase";
export type CarrierKind = "crate" | "suitcase" | "bag" | "duffel" | "techCase";

export type TokenConfig = {
  decimals: number;
  isPreset?: boolean;
  logoUri?: string | null;
  marketLabel: string;
  mint: string;
  name: string;
  symbol: string;
  visual: {
    accent: string;
    carrier: CarrierKind;
    emissive: string;
    glow: string;
    kind: AssetKind;
    primary: string;
    secondary: string;
  };
};

type PresetTokenInput = {
  decimals: number;
  logoUri?: string | null;
  marketLabel: string;
  mint: string;
  name: string;
  symbol: string;
  visual?: TokenConfig["visual"];
};

function buildFallbackLogoUri(mint: string) {
  return `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function inferVisual(symbol: string, mint: string): TokenConfig["visual"] {
  const normalized = symbol.trim().toUpperCase();

  if (
    normalized.includes("USD") ||
    normalized.includes("USDC") ||
    normalized.includes("USDT")
  ) {
    return {
      kind: "suitcase",
      carrier: "suitcase",
      primary: "#122130",
      secondary: "#22364a",
      accent: "#f4fbff",
      emissive: "#6aa7ff",
      glow: "#8fe1ff",
    };
  }

  if (
    normalized.includes("BONK") ||
    normalized.includes("DOG") ||
    normalized.includes("INU") ||
    normalized.includes("CAT")
  ) {
    return {
      kind: "duffel",
      carrier: "duffel",
      primary: "#2b1710",
      secondary: "#452412",
      accent: "#ffc067",
      emissive: "#ff8d45",
      glow: "#ffce93",
    };
  }

  const seed = hashString(mint);
  const palettes = [
    {
      primary: "#0f1720",
      secondary: "#172433",
      accent: "#7fe8ff",
      emissive: "#3a89ff",
      glow: "#80efff",
    },
    {
      primary: "#141a25",
      secondary: "#202a3a",
      accent: "#93f0eb",
      emissive: "#3bb1ff",
      glow: "#8bf1ff",
    },
    {
      primary: "#171420",
      secondary: "#221f31",
      accent: "#c6d5ff",
      emissive: "#667dff",
      glow: "#a5bcff",
    },
  ] as const;
  const carriers = [
    { kind: "crate", carrier: "crate" },
    { kind: "duffel", carrier: "duffel" },
    { kind: "duffel", carrier: "bag" },
  ] as const;
  const palette = palettes[seed % palettes.length];
  const carrier = carriers[(seed >> 2) % carriers.length];

  return {
    ...carrier,
    ...palette,
  };
}

function buildPresetToken(input: PresetTokenInput) {
  const symbol = input.symbol.trim().toUpperCase();

  return {
    decimals: input.decimals,
    isPreset: true,
    logoUri: input.logoUri ?? buildFallbackLogoUri(input.mint),
    marketLabel: input.marketLabel,
    mint: input.mint,
    name: input.name.trim(),
    symbol,
    visual: input.visual ?? inferVisual(symbol, input.mint),
  } satisfies TokenConfig;
}

export const PRESET_TOKENS: TokenConfig[] = [
  buildPresetToken({
    symbol: "SOL",
    name: "Solana",
    marketLabel: "Core settlement asset",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logoUri:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    visual: {
      kind: "crate",
      carrier: "crate",
      primary: "#19162b",
      secondary: "#9945ff",
      accent: "#14f195",
      emissive: "#7c3cff",
      glow: "#14f195",
    },
  }),
  buildPresetToken({
    symbol: "USDC",
    name: "USD Coin",
    marketLabel: "Core dollar rail",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    logoUri:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    visual: {
      kind: "suitcase",
      carrier: "suitcase",
      primary: "#123a7a",
      secondary: "#2775ca",
      accent: "#f4fbff",
      emissive: "#4f9dff",
      glow: "#8bc7ff",
    },
  }),
  buildPresetToken({
    symbol: "SOLBOT",
    name: "solarkbot",
    marketLabel: "House token",
    mint: "HP2fUgqcZ8WTir7Ht53r1WwDJVDv9M82K5YUefvApump",
    decimals: 6,
    logoUri: "https://ipfs.io/ipfs/bafkreiaqdi44jquks3tlsmqvtvnw5myte5v6h3jh5dd5ld4dw43vgazb7m",
    visual: {
      kind: "crate",
      carrier: "techCase",
      primary: "#081a2f",
      secondary: "#00b8ff",
      accent: "#86f7ff",
      emissive: "#0097ff",
      glow: "#5fe8ff",
    },
  }),
  buildPresetToken({
    symbol: "DUPE",
    name: "Dupe",
    marketLabel: "Curated ecosystem token",
    mint: "fRfKGCriduzDwSudCwpL7ySCEiboNuryhZDVJtr1a1C",
    decimals: 9,
    logoUri: "https://ipfs.io/ipfs/bafkreiaobt2ookhhoslvvard6oyjc6fw4askhg232yh22aqcgdddhrbcdy",
  }),
  buildPresetToken({
    symbol: "KLED",
    name: "KLEDAI",
    marketLabel: "Curated ecosystem token",
    mint: "1zJX5gRnjLgmTpq5sVwkq69mNDQkCemqoasyjaPW6jm",
    decimals: 9,
    logoUri: "https://ipfs.io/ipfs/bafkreicxgl43yyi3xg3zvi4hxsqmsobwxm7kto7i4qrbk75i2ff7w4jebe",
  }),
  buildPresetToken({
    symbol: "GRIFFAIN",
    name: "Griffain",
    marketLabel: "Curated ecosystem token",
    mint: "KENJSUYLASHUMfHyy5o4Hp2FdNqZg1AsUPhfH2kYvEP",
    decimals: 6,
    logoUri: "https://griffain.com/logo.png",
  }),
  buildPresetToken({
    symbol: "AVA",
    name: "Ava AI",
    marketLabel: "Curated ecosystem token",
    mint: "DKu9kykSfbN5LBfFXtNNDPaX35o4Fv6vJ9FKk7pZpump",
    decimals: 6,
    logoUri: "https://ipfs.io/ipfs/QmQdYxGMCLEZqWpgKo8BREBa5YSUbxFu6qaWiVXUW1yUhg",
  }),
  buildPresetToken({
    symbol: "SURGE",
    name: "SURGE",
    marketLabel: "Curated ecosystem token",
    mint: "3z2tRjNuQjoq6UDcw4zyEPD1Eb5KXMPYb4GWFzVT1DPg",
    decimals: 8,
    logoUri: "https://tokens.debridge.finance/0xaa9984487dacdc008d6bcd2adf21988388cc20d08b7594a1a96d812dab7f6605.png",
  }),
  buildPresetToken({
    symbol: "UMBRA",
    name: "Umbra",
    marketLabel: "Curated ecosystem token",
    mint: "PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta",
    decimals: 6,
    logoUri: "https://raw.githubusercontent.com/metaDAOproject/futarchy/refs/heads/develop/scripts/assets/UMBRA/UMBRA.png",
  }),
  buildPresetToken({
    symbol: "DREAMS",
    name: "Daydreams",
    marketLabel: "Curated ecosystem token",
    mint: "GMzuntWYJLpNuCizrSR7ZXggiMdDzTNiEmSNHHunpump",
    decimals: 6,
    logoUri: "https://ipfs.io/ipfs/QmPfRkbzpiBtH34ooJLPKGHsUtc6kswBy1owqbF5Hmn6uf",
  }),
];

export const PRESET_TOKEN_BY_SYMBOL = PRESET_TOKENS.reduce(
  (accumulator, token) => {
    accumulator[token.symbol] = token;
    return accumulator;
  },
  {} as Record<string, TokenConfig>,
);

export const PRESET_TOKEN_BY_MINT = PRESET_TOKENS.reduce(
  (accumulator, token) => {
    accumulator[token.mint] = token;
    return accumulator;
  },
  {} as Record<string, TokenConfig>,
);

export function createTokenConfig(input: {
  decimals: number;
  logoUri?: string | null;
  mint: string;
  name?: string;
  symbol?: string;
}) {
  const preset = PRESET_TOKEN_BY_MINT[input.mint];

  if (preset) {
    return preset;
  }

  const compactMint = `${input.mint.slice(0, 3)}${input.mint.slice(-3)}`;
  const symbol = (input.symbol?.trim() || compactMint || "TOKEN").toUpperCase();
  const name = input.name?.trim() || `${symbol} Asset`;

  return {
    decimals: input.decimals,
    logoUri: input.logoUri ?? buildFallbackLogoUri(input.mint),
    marketLabel: `${symbol} roaming desk`,
    mint: input.mint,
    name,
    symbol: symbol.slice(0, 10),
    visual: inferVisual(symbol, input.mint),
  } satisfies TokenConfig;
}

export function getAlternatePresetToken(excludedMint: string) {
  return PRESET_TOKENS.find((token) => token.mint !== excludedMint) ?? PRESET_TOKENS[0];
}

export function getTokenDisplaySymbol(token: TokenConfig) {
  return token.symbol.length <= 8 ? token.symbol : `${token.symbol.slice(0, 7)}+`;
}

export function formatTokenAmount(
  amount: number,
  token: Pick<TokenConfig, "decimals" | "symbol">,
) {
  const digits = amount >= 1000 ? 0 : Math.min(4, token.decimals);

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(amount)} ${getTokenDisplaySymbol(token as TokenConfig)}`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function amountToBaseUnits(value: string, decimals: number) {
  const sanitized = value.trim();

  if (!sanitized || Number.isNaN(Number(sanitized)) || Number(sanitized) < 0) {
    return null;
  }

  const [wholePart, fractionalPart = ""] = sanitized.split(".");
  const safeWhole = wholePart.replace(/\D/g, "") || "0";
  const safeFraction = fractionalPart.replace(/\D/g, "").slice(0, decimals);
  const paddedFraction = safeFraction.padEnd(decimals, "0");
  const units = `${safeWhole}${paddedFraction}`.replace(/^0+(?=\d)/, "");

  return units || "0";
}

export function baseUnitsToDecimal(
  value: string,
  decimals: number,
  maximumFractionDigits = Math.min(decimals, 6),
) {
  if (!/^\d+$/.test(value)) {
    return 0;
  }

  const normalized = value.padStart(decimals + 1, "0");
  const whole = normalized.slice(0, normalized.length - decimals) || "0";
  const fraction = normalized
    .slice(normalized.length - decimals)
    .slice(0, maximumFractionDigits);
  const numeric = Number(fraction ? `${whole}.${fraction}` : whole);

  return Number.isFinite(numeric) ? numeric : 0;
}
