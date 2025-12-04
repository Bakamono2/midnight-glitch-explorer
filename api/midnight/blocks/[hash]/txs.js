// Vercel serverless handler for fetching block transactions via Midnight RPC at /api/midnight/blocks/[hash]/txs.
export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rpcUrl = process.env.MIDNIGHT_RPC_URL;
  if (!rpcUrl) {
    res
      .status(500)
      .json({ error: 'MIDNIGHT_RPC_URL is not configured on the server' });
    return;
  }

  const { hash } = req.query || {};
  if (!hash || typeof hash !== 'string') {
    res.status(400).json({ error: 'Missing or invalid block hash' });
    return;
  }

  try {
    const rpcResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'chain_getBlock',
        params: [hash],
      }),
    });

    if (!rpcResponse.ok) {
      throw new Error(`RPC responded with ${rpcResponse.status}`);
    }

    const rpcJson = await rpcResponse.json();
    if (rpcJson.error) {
      throw new Error(rpcJson.error?.message || 'RPC error');
    }

    const extrinsics = rpcJson?.result?.block?.extrinsics;
    const transactions = Array.isArray(extrinsics)
      ? extrinsics.map((extrinsic, index) => {
          if (typeof extrinsic === 'string') {
            const truncated = `${extrinsic.substring(0, 18)}…`;
            return { hash: truncated, size: null };
          }
          return { hash: `extrinsic-${index}`, size: null };
        })
      : [];

    res.status(200).json(transactions);
  } catch (err) {
    console.error('[midnight/blocks/[hash]/txs] error', err);
    res.status(502).json({
      error: 'midnight_block_txs_failed',
      message: String(err),
    });
  }
}
