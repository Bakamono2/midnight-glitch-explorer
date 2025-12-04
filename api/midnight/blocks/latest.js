// Vercel serverless function for /api/midnight/blocks/latest
// Fetches the latest block from a Midnight RPC node via JSON-RPC.
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
    const latestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'chain_getBlock',
      params: [],
    };

    const latestResp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestBody),
    });

    if (!latestResp.ok) {
      throw new Error(`RPC status ${latestResp.status}`);
    }

    const latestJson = await latestResp.json();
    if (latestJson.error) {
      throw new Error(latestJson.error.message || 'RPC returned error');
    }

    const block = latestJson.result?.block;
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

    let hash = null;
    try {
      const hashBody = {
        jsonrpc: '2.0',
        id: 2,
        method: 'chain_getBlockHash',
        params: [height],
      };

      const hashResp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hashBody),
      });

      if (hashResp.ok) {
        const hashJson = await hashResp.json();
        if (!hashJson.error && hashJson.result) {
          hash = hashJson.result;
        }
      }
    } catch (hashErr) {
      console.warn('[midnight/blocks/latest] hash lookup failed', hashErr);
    }

    const normalized = {
      hash,
      height,
      timestamp: new Date().toISOString(),
      txCount,
      size: sizeBytes,
    };

    res.status(200).json(normalized);
  } catch (err) {
    console.error('[midnight/blocks/latest] error', err);
    res.status(502).json({ error: 'midnight_latest_failed', message: String(err) });
  }
}
