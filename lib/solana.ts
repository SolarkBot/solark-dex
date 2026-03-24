import {
  LAMPORTS_PER_SOL,
  Connection,
  PublicKey,
  type Commitment,
  type ParsedAccountData,
} from "@solana/web3.js";
import {
  PRESET_TOKEN_BY_MINT,
  PRESET_TOKENS,
  createTokenConfig,
  type TokenConfig,
} from "@/lib/tokens";

export const SOLANA_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.trim() ||
  "https://solana-rpc.publicnode.com";

export const SOLANA_COMMITMENT: Commitment = "confirmed";
const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);
const JUPITER_TOKEN_SEARCH_URL = "https://lite-api.jup.ag/tokens/v2/search";

type JupiterTokenSearchItem = {
  decimals?: number;
  icon?: string | null;
  id?: string;
  name?: string;
  symbol?: string;
};

export function getSolanaConnection() {
  return new Connection(SOLANA_RPC_ENDPOINT, SOLANA_COMMITMENT);
}

export function shortenAddress(
  address: PublicKey | string | null | undefined,
  visibleChars = 4,
) {
  const value = typeof address === "string" ? address : address?.toBase58();

  if (!value) {
    return "Wallet";
  }

  return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
}

export function getEmptyWalletBalances(tokens: TokenConfig[] = PRESET_TOKENS) {
  return tokens.reduce(
    (accumulator, token) => {
      accumulator[token.mint] = 0;
      return accumulator;
    },
    {} as Record<string, number>,
  );
}

export function isValidMintAddress(value: string) {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

async function fetchJupiterTokenMetadata(mint: string) {
  try {
    const params = new URLSearchParams({ query: mint });
    const response = await fetch(`${JUPITER_TOKEN_SEARCH_URL}?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;

    if (!Array.isArray(data)) {
      return null;
    }

    const items = data as JupiterTokenSearchItem[];
    const match = items.find((token) => token.id === mint) ?? items[0];

    if (!match) {
      return null;
    }

    return {
      decimals: Number(match.decimals),
      logoUri: match.icon?.trim() || null,
      name: match.name?.trim() || undefined,
      symbol: match.symbol?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export async function resolveTokenConfig(
  connection: Connection,
  mint: string,
) {
  const normalizedMint = mint.trim();
  const preset = PRESET_TOKEN_BY_MINT[normalizedMint];

  if (preset) {
    return preset;
  }

  const accountInfo = await connection.getParsedAccountInfo(
    new PublicKey(normalizedMint),
    SOLANA_COMMITMENT,
  );

  const parsedData = accountInfo.value?.data;

  if (!parsedData || typeof parsedData === "string") {
    throw new Error("Mint account was not found on Solana.");
  }

  const parsed = parsedData as ParsedAccountData;

  if (
    !["spl-token", "spl-token-2022"].includes(parsed.program) ||
    parsed.parsed.type !== "mint"
  ) {
    throw new Error("The pasted address is not a valid SPL token mint.");
  }

  const decimals = Number(parsed.parsed.info.decimals);

  if (!Number.isFinite(decimals)) {
    throw new Error("Unable to determine token decimals for this mint.");
  }

  const metadata = await fetchJupiterTokenMetadata(normalizedMint);

  return createTokenConfig({
    decimals:
      metadata && Number.isFinite(metadata.decimals) ? metadata.decimals : decimals,
    logoUri: metadata?.logoUri,
    mint: normalizedMint,
    name: metadata?.name,
    symbol: metadata?.symbol,
  });
}

export async function getWalletBalances(
  connection: Connection,
  owner: PublicKey,
  tokens: TokenConfig[],
) {
  const uniqueTokens = Array.from(
    new Map(tokens.map((token) => [token.mint, token])).values(),
  );
  const balances = getEmptyWalletBalances(uniqueTokens);
  const [solBalance, tokenAccounts, token2022Accounts] = await Promise.all([
    connection.getBalance(owner, SOLANA_COMMITMENT),
    connection.getParsedTokenAccountsByOwner(
      owner,
      { programId: SPL_TOKEN_PROGRAM_ID },
      SOLANA_COMMITMENT,
    ),
    connection.getParsedTokenAccountsByOwner(
      owner,
      { programId: TOKEN_2022_PROGRAM_ID },
      SOLANA_COMMITMENT,
    ),
  ]);
  const allTokenAccounts = [...tokenAccounts.value, ...token2022Accounts.value];

  for (const token of uniqueTokens) {
    if (token.symbol === "SOL" || token.mint === PRESET_TOKENS[0].mint) {
      balances[token.mint] = solBalance / LAMPORTS_PER_SOL;
      continue;
    }

    balances[token.mint] = allTokenAccounts.reduce((sum, accountInfo) => {
      const parsedData = accountInfo.account.data.parsed;

      if (parsedData.type !== "account") {
        return sum;
      }

      const info = parsedData.info;

      if (info.mint !== token.mint) {
        return sum;
      }

      return sum + (Number(info.tokenAmount.uiAmount) || 0);
    }, 0);
  }

  return balances;
}
