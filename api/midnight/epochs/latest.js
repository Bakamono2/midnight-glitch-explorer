// Vercel serverless function for /api/midnight/epochs/latest
// Stubbed response until real epoch data wiring is available.
export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const epochNumber = 1; // non-zero to satisfy UI expectations

  // Provide both legacy and current field names so the frontend normalizers can
  // pick up epoch data regardless of mapping.
  const epoch = {
    // Primary epoch identifiers
    epoch: epochNumber,
    epochNumber,

    // Counts (duplicated to support different normalizers)
    blockCount: 0,
    txCount: 0,
    block_count: 0,
    tx_count: 0,

    // End times (duplicated field names)
    endTime: new Date(now + oneHour).toISOString(),
    epochEndTime: new Date(now + oneHour).toISOString(),
  };

  res.status(200).json(epoch);
}
