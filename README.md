# Midnight Glitch Explorer

A fun, cyberpunk-themed viewer for Midnight testnet transactions.

## Setup
1. Add your Midnight Indexer settings to Vercel env vars:
   - `REACT_APP_MIDNIGHT_INDEXER_URL` (base URL, e.g., `https://indexer.midnight.network/api/v1`)
   - `REACT_APP_MIDNIGHT_INDEXER_KEY` (API key/token)
   - Optional: `REACT_APP_MIDNIGHT_INDEXER_AUTH_HEADER` (defaults to `x-api-key`)
2. (Preferred fallback) configure the Midnight testnet-02 indexer (used automatically if present and before Blockfrost):
   - `REACT_APP_MIDNIGHT_TESTNET_URL` (defaults to `https://testnet-02.midnight.network/api/v1` if unset)
   - Optional: `REACT_APP_MIDNIGHT_TESTNET_KEY` and `REACT_APP_MIDNIGHT_TESTNET_AUTH_HEADER` (header defaults to the indexer auth header)
3. (Optional final fallback) keep `REACT_APP_BLOCKFROST_KEY` set to let the app fall back to Blockfrost only if both indexers are unavailable.
4. Deploy to Vercel.

## Features
- Live block fetches
- Glitch effects & confetti
- Easy switch to mainnet

## Debugging which provider is active

The home screen surfaces the active data sources while you build or debug:

- **Block/Tx Provider** shows which backend served the latest block/transaction fetch (Midnight Indexer, Midnight testnet-02, or Blockfrost).
- **Epoch Provider** shows which backend served the latest epoch metadata fetch.

The app also logs provider selections to the browser console (e.g., `[provider] block+tx source => indexer`).
