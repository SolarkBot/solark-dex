# Solana 3D Interactive Swap DEX

Premium MVP for a cinematic Solana swap experience built with Next.js App Router, TypeScript, Tailwind CSS, React Three Fiber, and Solana wallet adapter.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Production

```bash
npm run build
npm run start
```

## Environment Variables

Create a `.env.local` file with your Jupiter Ultra API key. You can also override the default Solana RPC endpoint:

```bash
JUP_API_KEY=your-jupiter-api-key
JUP_API_BASE_URL=https://api.jup.ag/ultra/v1
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://your-rpc-endpoint
```

## Notes

- Wallet connectivity is wired for Phantom and Solflare.
- Jupiter Ultra order, execute, and holdings calls are proxied through Next.js API routes so the API key stays server-side.
- Quotes, supported token balances, and swaps are live for the tokens listed in `lib/tokens.ts`.
- Jupiter Ultra is deprecated in the official docs in favor of Swap API V2, but this project now targets Ultra because that is the requested integration path.
