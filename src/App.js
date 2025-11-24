import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [wheelBlocks, setWheelBlocks] = useState([]);
  const [particles, setParticles] = useState([]);
  const [ghosts, setGhosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wheelRotation, setWheelRotation] = useState(0);

  const addParticle = () => {
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        setParticles(p => [...p, { id: Date.now() + i }].slice(-80));
      }, i * 50);
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
          return updated.slice(0, 12); // 12 blocks on the wheel
        });
        setWheelRotation(r => r - 30); // 360° / 12 = 30° per block
        addParticle();
        if (txCount > 0) spawnGhost();
        if (txCount > 5) confetti({ particleCount: 300, spread: 120, origin: { y: 0.4 }, colors: ['#ffd700', '#ff00ff', '#00ffff'] });
      }
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, [latest]);

  if (loading) return <div className="loading glitch" data-text="ENTERING THE VOID...">ENTERING THE VOID...</div>;

  return (
    <div className="App">
      {/* Rain & Ghosts */}
      {particles.map(p => <div key={p.id} className="rain"></div>)}
      {ghosts.map(g => <div key={g.id} className="ghost" style={{ left: `${g.left}%` }}>Zero-Knowledge Ghost</div>)}

      <header className="header">
        <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
        <p className="subtitle" data-text="WHEEL">WHEEL</p>
      </header>

      {/* THE 3D WHEEL */}
      <div className="wheel-container">
        <div className="wheel" style={{ transform: `translateZ(-300px) rotateX(${wheelRotation}deg)` }}>
          {wheelBlocks.map((block, i) => (
            <div
              key={block.hash}
              className="wheel-block"
              style={{ transform: `rotateX(${i * 30}deg) translateZ(300px)` }}
            >
              <div className="block-face">
                <h3>#{block.height}</h3>
                <p>{block.tx_count || 0} shielded tx</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="status">
        <span className="live">LIVE</span> Midnight Testnet — The Wheel Never Stops
      </div>

      <footer>
        <p><span className="glitch" data-text="shhh...">shhh...</span> the ledger turns forever</p>
      </footer>
    </div>
  );
}

export default App;
