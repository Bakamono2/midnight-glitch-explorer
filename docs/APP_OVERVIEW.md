# Midnight Glitch Explorer: Detailed System Overview

This document explains the app’s runtime flow, data sources, and key UI/visual features so another model can understand what is being built and how it operates.

## Data providers and selection
- The app prioritizes Midnight Indexer (`REACT_APP_MIDNIGHT_INDEXER_URL`) for blocks, transactions, and epoch metadata. If the primary indexer is absent or fails, it tries the Midnight testnet-02 indexer (`REACT_APP_MIDNIGHT_TESTNET_URL`, defaulting to `https://testnet-02.midnight.network/api/v1`). Blockfrost is only attempted when both indexers are unavailable **and** `REACT_APP_ALLOW_BLOCKFROST_FALLBACK` is true. Provider ordering is rebuilt on each fetch so configuration changes apply without a reload. Authentication headers are configurable per provider (`REACT_APP_MIDNIGHT_INDEXER_AUTH_HEADER`, `REACT_APP_MIDNIGHT_TESTNET_AUTH_HEADER`, or `project_id` for Blockfrost). Successful provider choices are recorded in state for UI badges and console logs.

## Polling cadence and normalization
- Blocks and transactions: every 8 seconds the app fetches `/blocks/latest` plus `/blocks/{hash}/txs` from the preferred provider order. Responses are normalized to a common shape (hash, height, timestamp, transaction count, size). If a new block is detected, the UI updates the latest block card, timeline, transaction rate, and spawns rain columns (one per transaction). A console log identifies the backend serving the current block/tx data.
- Epoch metadata: every 60 seconds the app pulls `/epochs/latest`, normalizes epoch number, block count, transaction count, and end time, and records the active epoch provider. A 1-second interval counts down to epoch end using the stored end timestamp.
- Time since last block: recalculated once per second from the latest block timestamp to keep the stats bar fresh.

## Visual layer: digital rain
- One rain column spawns per transaction, respecting the transaction count from the newest block. Each column has a skew toward longer tails (random length 24–64 glyphs), per-column speed/jitter, optional highlight flag, and slight rotation. A debug stress toggle can spawn extra drops without hitting the APIs. The renderer caps active columns based on viewport scale to prevent overwhelming the canvas during heavy traffic or stress testing.
- Animation uses `requestAnimationFrame`. Each frame starts by fading the canvas with a semi-transparent black destination-out fill to remove afterglow. Tails draw with green–cyan colors and fading opacity **without** glow; highlighted heads draw up to three leading glyphs with brighter white glow, while non-highlighted heads use modest cyan glow. Shadow and composite settings reset each frame and after head glyphs to avoid visual bleed. Columns are culled after leaving the viewport plus a tail allowance so long streams finish fading but do not consume resources off-screen. An active-drop counter updates periodically for debugging.

## UI layout and behavior
- **Latest Block card:** shows height, truncated hash, and transaction count from the newest block. The heading glitches in timed bursts. Under it lives the stress-test toggle and active-drop counter for the rain canvas.
- **Dashboard stats bar:** grid of metrics (Tx/s, blocks this epoch, epoch transactions, epoch number, latest block size, time since block, epoch countdown) with neon hover states. Values derive from normalized block and epoch data plus derived timers.
- **Timeline:** lists recent blocks with heights/transaction counts, highlights the newest entry, and provides hover feedback. It auto-collapses on small screens.
- **Provider badges and debug panel:** badges display the active block/tx provider and epoch provider. When indexers fail or Blockfrost fallback is disabled, a debug panel surfaces recent provider errors and reminders about the fallback toggle.

## Configuration
- Primary env vars live in Vercel (or `.env` locally). Important keys include `REACT_APP_MIDNIGHT_INDEXER_URL/KEY/AUTH_HEADER`, `REACT_APP_MIDNIGHT_TESTNET_URL/KEY/AUTH_HEADER`, `REACT_APP_ALLOW_BLOCKFROST_FALLBACK`, and optional `REACT_APP_BLOCKFROST_KEY` as a last resort. The overlay mode for the rain can be toggled at runtime by pressing `o` (debug only) to switch between dark and transparent fading.
