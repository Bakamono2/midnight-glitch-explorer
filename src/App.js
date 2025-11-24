import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [block, setBlock] = useState(null);
  const [txs, setTxs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const latestRes = await fetch(`${BASE_URL}/blocks/latest`, {
        headers: { project_id: API_KEY }
      });
      const latest = await latestRes.json();

      const txsRes = await fetch(`${BASE_URL}/blocks/${latest.hash}/txs`, {
        headers: { project_id: API_KEY }
      });
      const transactions = await txsRes.json();

      setBlock(latest);
      setTxs(transactions.length);
      setError(null);
      setLoading(false);

      if (transactions.length > 0) {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#00ffff', '#ff00ff', '#7400b8']
        });
        const shhh = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUX+');
        shhh.volume = 0.2; shhh.play().catch(() => {});
      }
    } catch (err) {
      setError('Check your Blockfrost key');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="loading glitch" data-text="SCANNING...">SCANNING...</div>;
  if (error) return <div className="error glitch" data-text="ERROR">{error}</div>;

  return (
    <div className="App">
      <header className="header">
        <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
        <p className="subtitle glitch" data-text="GLITCH EXPLORER">GLITCH EXPLORER</p>
      </header>

      <main>
        <div className="card">
          <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
          <p className="block-num">#{block?.height || block?.slot || '???'}</p>
          <p className="hash">Hash: {(block?.hash || '').slice(0, 24)}...</p>
          <p className="txs">
            {txs} transaction{txs !== 1 ? 's' : ''} shielded in zero-knowledge
          </p>
        </div>
        <div className="status">
          <span className="live">● LIVE</span> Midnight Testnet via Blockfrost
        </div>
      </main>

      <footer>
        <p>
          <span className="glitch" data-text="shhh...">shhh...</span> your secrets are safe
        </p>
      </footer>
    </div>
  );
}

export default App;
