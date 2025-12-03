# Midnight Glitch Explorer

A fun, cyberpunk-themed viewer for Midnight testnet transactions.

## Setup
1. Add your Midnight Indexer settings to Vercel env vars:
   - `REACT_APP_MIDNIGHT_INDEXER_URL` (base URL, e.g., `https://indexer.midnight.network/api/v1`)
   - `REACT_APP_MIDNIGHT_INDEXER_KEY` (API key/token)
   - Optional: `REACT_APP_MIDNIGHT_INDEXER_AUTH_HEADER` (defaults to `x-api-key`)
2. (Optional fallback) keep `REACT_APP_BLOCKFROST_KEY` set to let the app fall back to Blockfrost if the indexer is unavailable.
3. Deploy to Vercel.

## Features
- Live block fetches
- Glitch effects & confetti
- Easy switch to mainnet
