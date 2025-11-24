import React, { useState, useEffect } from 'react';
import Blockfrost from 'blockfrost-js';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;

const blockfrost = new Blockfrost(API_KEY, 'preprod');
// ↑ Change 'preprod' → 'mainnet' when Midnight mainnet launches

function App() {
  const [block, setBlock] = useState(null);
  const [txs, setTxs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const latest = await blockfrost.blocksLatest();
      const transactions = await blockfrost.blocksTxs(latest.hash);

      setBlock(latest);
      setTxs(transactions.length);
      setError(null);
      setLoading(false);

      if (transactions.length > 0) {
        // Encrypted confetti rain
        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#00ffff', '#ff00ff', '#7400b8', '#000000'],
          shapes: ['square', 'circle'],
          scalar: 1.3,
          ticks: 120,
        });

        // Tiny "shhh" privacy sound
        const shhh = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUX+');
        shhh.volume = 0.2;
        shhh.play().catch(() => {});
      }
    } catch (err) {
      setError('Check your Blockfrost key or network');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading glitch" data-text="LOADING...">LOADING...</div>;
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
          <p className="block-num">#{block?.height || block?.block_no || '???'}</p>
          <p className="hash">Hash: {(block?.hash || '').slice(0, 24)}...</p>
          <p className="txs">
            {txs} transaction{txs !== 1 ? 's' : ''} shielded in zero-knowledge
          </p>
        </div>

        <div className="status">
          <span className="live">● LIVE</span> Testnet • Midnight Network
        </div>
      </main>

      <footer>
        <p>
          <span className="glitch" data-text="shhh...">shhh...</span> your data never left the dark
        </p>
      </footer>
    </div>
  );
}

export default App;
