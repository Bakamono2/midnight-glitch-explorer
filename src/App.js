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

  const addParticle = (count) => {
    for (let i = 0; i < Math.min(count * 3, 30); i++) {
      setTimeout(() => {
        setParticles(p => [...p, { 
          id: Date.now() + i + Math.random(),
          left: Math.random() * 100 
        }].slice(-120));
      }, i * 80);
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
        // LIMIT TO LAST 40 BLOCKS
        setRecentBlocks(prev => [block, ...prev].slice(0, 40));
        addParticle(txCount);
        if (txCount > 0) spawnGhost();

        if (txCount > 8) {
          confetti({ particleCount: 300, spread: 160, origin: { y: 0.3 }, colors: ['#ffd700', '#ff00ff', '#00ffff'] });
        }
      }
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6500);
    return () => clearInterval(interval);
  }, [latest]);

  if (loading) return <div className="loading glitch" data-text="ENTERING THE SHADOWS...">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {particles.map(p => <div key={p.id} className="rain" style={{ left: `${p.left}%` }}></div>)}
      {ghosts.map(g => <div key={g.id} className="ghost" style={{ left: `${g.left}%` }}>SHIELDED</div>)}

      <header className="header">
        <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
        <p className="subtitle" data-text="EXPLORER">EXPLORER</p>
      </header>

      <main>
        <div className="card main-card">
          <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
          <p className="block-num">#{latest?.height || '???'}</p>
          <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
          <p className="txs">{latest ? recentBlocks[0]?.tx_count || 0 : 0} shielded transactions</p>
        </div>

        <div className="recent-blocks">
          {recentBlocks.slice(1).map(b => (
            <div key={b.hash} className="mini-card">
              #{b.height} — {b.tx_count || 0} tx
            </div>
          ))}
        </div>

        <div className="stats-bar">
          <span>{recentBlocks.length > 1 ? ((recentBlocks[0].height - recentBlocks[recentBlocks.length-1].height) / ((recentBlocks.length-1) * 6.5)).toFixed(2) : '0.00'} tx/s</span>
          <span>{recentBlocks.length - 1} blocks shown</span>
          <span>{ghosts.length} ghosts watching</span>
        </div>

        <div className="controls">
          <button onClick={() => document.body.classList.toggle('dawn')}>Dawn Mode</button>
        </div>
      </main>

      <footer>
        <p><span className="glitch" data-text="shhh...">shhh...</span> nothing ever happened</p>
      </footer>
    </div>
  );
}

export default App;
