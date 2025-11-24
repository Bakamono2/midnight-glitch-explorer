import React, { useState, useEffect } from 'react';
import Blockfrost from 'blockfrost-js';
import confetti from 'canvas-confetti';
import Glitch from 'react-glitch-effect'; // For glitchy text
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY || 'YOUR_BLOCKFROST_KEY_HERE'; // ← Add your key here or via Vercel env
const blockfrost = new Blockfrost(API_KEY, 'midnighttestnet'); // Flip to 'mainnet' when live

function App() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestBlocks();
    const interval = setInterval(fetchLatestBlocks, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchLatestBlocks = async () => {
    try {
      const latestBlock = await blockfrost.blocksLatest();
      const txs = await blockfrost.blocksTxs(latestBlock.hash);
      setBlocks([{ number: latestBlock.block, hash: latestBlock.hash, txs: txs.length }]);
      if (txs.length > 0) {
        // Fun: Confetti for new txs (encrypted particles)
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 }, colors: ['#00ffff', '#ff00ff', '#000'] });
      }
      setLoading(false);
    } catch (error) {
      console.error('API error:', error);
    }
  };

  if (loading) return <div className="loading">Scanning the shadows...</div>;

  return (
    <div className="App">
      <header className="header">
        <Glitch>{/* Glitch wrapper for title */}
          <h1>Midnight Glitch Explorer</h1>
          <p>Testnet Shadows: Privacy Unlocked</p>
        </Glitch>
      </header>
      <main>
        {blocks.map((block, i) => (
          <div key={i} className="block-card">
            <h2>Block #{block.number}</h2>
            <p>Hash: {block.hash.slice(0, 16)}...</p>
            <p>Txs: {block.txs} (Shrouded in ZK magic)</p>
            <ul>
              {block.txs > 0 && <li key="fun">🛡️ Privacy Level: MAX (Zero-Knowledge Ghosts)</li>}
            </ul>
          </div>
        ))}
      </main>
      <footer>
        <p>Next update in 5s... <span className="glitch">Shhh...</span></p>
      </footer>
    </div>
  );
}

export default App;
