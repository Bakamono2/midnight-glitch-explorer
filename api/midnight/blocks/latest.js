// Vercel serverless function for /api/midnight/blocks/latest
// Supports fetching either the single latest block (default) or a capped range
// of blocks starting from fromHeight for catch-up. Blocks are normalized to the
// same shape the frontend already expects.
const MAX_RANGE = 30;

const rpc = async (rpcUrl, method, params = [], id = 1) => {
  const resp = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });

  if (!resp.ok) {
    throw new Error(`RPC status ${resp.status}`);
  }

  const json = await resp.json();
  if (json.error) {
    throw new Error(json.error.message || 'RPC returned error');
  }

  return json;
};

const normalizeBlock = (blockJson, hash, timestampOverride = null) => {
  const block = blockJson?.result?.block;
  const header = block?.header;
  const height = header?.number ? parseInt(header.number, 16) : NaN;

  if (!Number.isFinite(height)) {
    throw new Error('Invalid block height from RPC response');
  }

  const extrinsics = block?.extrinsics;
  const txCount = Array.isArray(extrinsics) ? extrinsics.length : 0;
  let sizeBytes = 0;

  if (Array.isArray(extrinsics)) {
    for (const ext of extrinsics) {
      if (typeof ext === 'string') {
        const hex = ext.startsWith('0x') ? ext.slice(2) : ext;
        sizeBytes += Math.floor(hex.length / 2);
      }
    }
  }

  return {
    hash: hash ?? null,
    height,
    timestamp: timestampOverride || new Date().toISOString(),
    txCount,
    size: sizeBytes
  };
};

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rpcUrl = process.env.MIDNIGHT_RPC_URL;
  if (!rpcUrl) {
    res.status(500).json({ error: 'missing_midnight_rpc_url' });
    return;
  }

  try {
    const { fromHeight } = req.query || {};

    // Always fetch the latest block once so both single and range modes share the
    // same normalization path.
    const latestJson = await rpc(rpcUrl, 'chain_getBlock', [], 1);
    const latestHashJson = await rpc(rpcUrl, 'chain_getBlockHash', [], 2);
    const latestHash = latestHashJson?.result ?? null;
    const latestBlock = normalizeBlock(latestJson, latestHash);

    if (fromHeight === undefined) {
      res.status(200).json(latestBlock);
      return;
    }

    const startHeight = parseInt(fromHeight, 10);
    if (!Number.isFinite(startHeight) || startHeight < 0) {
      res.status(400).json({ error: 'Invalid fromHeight' });
      return;
    }

    const latestHeight = latestBlock.height;
    if (startHeight > latestHeight) {
      res.status(200).json([]);
      return;
    }

    const endHeight = Math.min(latestHeight, startHeight + MAX_RANGE - 1);
    const blocks = [];

    for (let h = startHeight; h <= endHeight; h++) {
      const heightHex = `0x${h.toString(16)}`;
      const blockHashJson = await rpc(rpcUrl, 'chain_getBlockHash', [heightHex], 2 + h - startHeight + 1);
      const blockHash = blockHashJson?.result ?? null;
      const blockJson = await rpc(rpcUrl, 'chain_getBlock', [blockHash], 500 + h);
      const normalized = normalizeBlock(blockJson, blockHash);
      blocks.push(normalized);
    }

    res.status(200).json(blocks);
  } catch (err) {
    console.error('[midnight/blocks/latest] error', err);
    res.status(502).json({ error: 'midnight_latest_failed', message: String(err) });
  }
}
