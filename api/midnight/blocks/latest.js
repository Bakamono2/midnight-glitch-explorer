// Placeholder Vercel serverless function for /api/midnight/blocks/latest
// TODO: Implement logic once requirements are provided.
export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.status(200).json({ message: 'Blocks latest endpoint stub' });
}
