// Vercel serverless function for /api/midnight/epochs/latest
// Stubbed response until real epoch data wiring is available.
export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  // Shape matches provider expectations: epochNumber, blockCount, txCount, epochEndTime
  const epoch = {
    epochNumber: 0,
    blockCount: 0,
    txCount: 0,
    epochEndTime: new Date(now + oneHour).toISOString(),
  };

  res.status(200).json(epoch);
}
