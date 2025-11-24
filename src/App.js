import React, { useState, useEffect } from 'react';
import Blockfrost from 'blockfrost-js';
import confetti from 'canvas-confetti';

// === CONFIGURATION ===
// Put your Blockfrost Project ID (the long string starting with "preprod...") 
// in Vercel Environment Variables as: REACT_APP_BLOCKFROST_KEY
const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY || 'YOUR_PREPROD_KEY_HERE_TEMP';

// This works for Midnight testnet right now (Nov 2025)
const blockfrost = new Blockfrost(API_KEY, 'preprod');  
// ↑ When mainnet launches, just change 'preprod' → 'mainnet'

function App() {
  const [latestBlock, setLatestBlock] = useState(null);
  const [txCount, setTxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLatest = async () => {
    try {
      const block = await blockfrost.blocksLatest();
      const txs = await blockfrost.blocksTxs(block.hash);

      setLatestBlock(block);
      setTxCount(txs.length);
      setError(null);
      setLoading(false);

      // Fun confetti + encrypted particles when real txs appear
      if (txs.length > 0) {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#00ffff', '#ff00ff', '#7400b8'],
          scalar: 1.2,
          shapes: ['square', 'circle'],
          ticks: 100,
        });

        // Optional tiny "shhh" sound (privacy vibe)
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUX+');
        audio.volume = 0.15;
        audio.play().catch(() => {}); // browsers block autoplay sometimes
      }
    } catch (err) {
      console.error(err);
      setError('API key missing or rate-limited. Add your Preprod key in Vercel!');
    }
  };

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 7000); // Refresh every 7 sec
    return () => clearInterval(interval);
  }, []);

  if (loading && !latestBlock) {
    return <div className="loading">Decrypting the shadows...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="App">
      <header className="header">
        <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
        <p className="subtitle">Glitch Explorer • Testnet Live • Privacy = Freedom</p>
      </header>

      <main className="block-info">
        <div className="card">
          <h2>Latest Block</h2>
          <p className="block-number">#{latestBlock?.height || latestBlock?.block_no}</p>
          <p className="hash">Hash: {(latestBlock?.hash || '').slice(0, 20)}...</p>
          <p className="tx-count">
            {txCount} transaction{txCount !== 1 ? 's' : ''} in this block
            {txCount > 0 && ' 🛡️ Shrouded in zero-knowledge'}
          </p>
        </div>

        <div className="status">
          <span className="pulse">● LIVE</span> Next scan in ~7s
        </div>
      </main>

      <footer>
        <p>
          Built with 💜 for the Midnight community •{' '}
          <span className="glitch" data-text="shhh...">shhh...</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
