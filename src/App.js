import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [particles, setParticles] = useState([]);
  const [ghosts, setGhosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add falling encrypted particle
  const addParticle = (txCount) => {
    const intensity = txCount > 4 ? 'high' : txCount > 1 ? 'medium' : 'low';
    const id = Date.now() + Math.random();
    setParticles(p => [...p, { id, intensity }].slice(-80));
  };

  // Spawn a privacy ghost
  const spawnGhost = () => {
    const id = Date.now();
    setGhosts(g => [...g, { id, left: Math.random() * 80 + 10 }]);
    const shhh = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUX+');
    shhh.volume = 0.25; shhh.play().catch(() => {});
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
      const block = await res.json();
      const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
      const txs = await txRes.json();

      if (!latest || block.height > latest.height) {
        setLatest(block);
        setRecentBlocks(prev => [block, ...prev].slice(0, 10));
        addParticle(txs.length);
        if (txs.length > 0) spawnGhost();

        // Legendary confetti for busy blocks
        if (txs.length > 6) {
          confetti({
            particleCount: 250,
            spread: 120,
            origin: { y: 0.4 },
            colors: ['#ff00ff', '#00ffff', '#ffd700', '#000'],
            shapes: ['square', 'circle'],
            scalar: 1.5
          });
        }
      }
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, [latest]);

  if (loading) return <div className="loading glitch" data-text="ENTERING THE SHADOWS...">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {/* Falling encrypted particles */}
      {particles.map(p => (
        <div key={p.id} className={`particle ${p.intensity}`}></div>
      ))}

      {/* Zero-knowledge ghosts */}
      {ghosts.map(g => (
        <div key={g.id} className="ghost" style={{ left: `${g.left}%` }}>Zero-Knowledge Ghost</div>
      ))}

      <header className="header">
        <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
        <p className="subtitle" data-text="EXPLORER">EXPLORER</p>
      </header>

      <main>
        <div className="card main-card">
          <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
          <p className="block-num">#{latest?.height || '???'}</p>
          <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
          <p className="txs">{recentBlocks[0]?.tx_count || 0} shielded transactions</p>
        </div>

        {/* Recent blocks carousel */}
        <div className="recent-blocks">
          {recentBlocks.slice(1).map(b => (
            <div key={b.hash} className="mini-card">
              <span className="mini-height">#{b.height}</span>
              <span className="mini-txs">{b.tx_count || 0} tx</span>
            </div>
          ))}
        </div>

        <div className="status">
          <span className="live">LIVE</span> Midnight Testnet — Privacy Eternal
        </div>
      </main>

      <footer>
        <p><span className="glitch" data-text="shhh...">shhh...</span> nothing to see here</p>
      </footer>
    </div>
  );
}

export default App;
