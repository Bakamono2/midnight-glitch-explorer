import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [wheelBlocks, setWheelBlocks] = useState([]); // Start with dummy for instant load
  const [particles, setParticles] = useState([]);
  const [ghosts, setGhosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);

  // Dummy blocks for instant wheel render
  const dummyBlocks = Array.from({ length: 12 }, (_, i) => ({
    height: `###`,
    hash: 'loading...',
    tx_count: 0
  }));

  const addParticle = () => {
    for (let i = 0; i < 25; i++) {
      setTimeout(() => {
        setParticles(p => [...p, { id: Date.now() + i, left: Math.random() * 100 }].slice(-100));
      }, i * 60);
    }
  };

  const spawnGhost = () => {
    setGhosts(g => [...g, { id: Date.now(), left: Math.random() * 80 + 10 }]);
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
      const block = await res.json();
      const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
      const txs = await txRes.json();

      if (!latest || block.height > latest.height) {
        const txCount = txs.length;
        setLatest(block);
        setWheelBlocks(prev => {
          const updated = [block, ...prev.filter(b => b.height !== block.height)];
          return updated.slice(0, 12).map(b => b || dummyBlocks[0]); // Fallback
        });
        setRotation(r => r - 30); // Smooth 30° shift per block
        addParticle();
        if (txCount > 0) spawnGhost();
        if (txCount > 6) confetti({ particleCount: 400, spread: 140, origin: { y: 0.5 }, colors: ['#ffd700', '#ff00ff', '#00ffff'] });
      }
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  useEffect(() => {
    setWheelBlocks(dummyBlocks); // Instant dummy wheel
    fetchData();
    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading glitch" data-text="SPINNING UP THE SHADOWS...">SPINNING UP THE SHADOWS...</div>;

  return (
    <div className="App">
      {particles.map(p => <div key={p.id} className="rain" style={{ left: `${p.left}%` }}></div>)}
      {ghosts.map(g => <div key={g.id} className="ghost" style={{ left: `${g.left}%` }}>Zero-Knowledge Ghost</div>)}

      <header className="header">
        <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
        <p className="subtitle" data-text="WHEEL">WHEEL</p>
      </header>

      {/* DASHBOARD — FULLY RESTORED */}
      <div className="main-card">
        <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
        <p className="block-num">#{latest?.height || '???'}</p>
        <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
        <p className="txs">{latest ? wheelBlocks[0]?.tx_count || 0 : 0} shielded transactions</p>
      </div>

      {/* FIXED HORIZONTAL 3D WHEEL */}
      <div className="wheel-container">
        <div className="wheel" style={{ transform: `rotateY(${rotation}deg)` }}>
          {wheelBlocks.map((block, i) => (
            <div
              key={block.hash || i}
              className={`wheel-block ${i === 0 ? 'front' : ''}`}
              style={{ 
                transform: `rotateY(${i * 30}deg) translateZ(350px)`,
                '--depth': `${350 - (i * 20)}px` // Fade back
              }}
            >
              <div className="block-face">
                <h3>#{block.height}</h3>
                <p>{block.tx_count || 0} tx</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="status">
        <span className="live">● LIVE</span> Midnight Testnet — The Wheel Eternal
      </div>

      <footer>
        <p><span className="glitch" data-text="shhh...">shhh...</span> the shadows spin forever</p>
      </footer>
    </div>
  );
}

export default App;
