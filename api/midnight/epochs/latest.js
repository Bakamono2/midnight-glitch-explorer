// Placeholder Vercel serverless function for /api/midnight/epochs/latest
// TODO: Implement logic once requirements are provided.
export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.status(200).json({ message: 'Epochs latest endpoint stub' });
}
