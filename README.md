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

Create a `.env.local` file with your Jupiter Ultra API key. Keep the browser RPC on a read-friendly endpoint and use a server-only RPC for backend reads if needed:

```bash
JUP_API_KEY=your-jupiter-api-key
JUP_ULTRA_API_BASE_URL=https://api.jup.ag/ultra/v1
SOLANA_RPC_ENDPOINT=https://your-server-rpc-endpoint
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://solana-rpc.publicnode.com
```

## Notes

- Wallet connectivity is wired for Phantom only.
- Jupiter Ultra order and execute calls are proxied through Next.js API routes so the API key stays server-side.
- Quotes, supported token balances, and swaps are live for the tokens listed in `lib/tokens.ts`.
- The browser no longer broadcasts or confirms swap transactions directly against the public Solana RPC during the main swap flow.
