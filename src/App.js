// src/App.js — Midnight Explorer 2.0
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

  const addParticle = (txCount) => {
    const newParticle = {
      id: Date.now() + Math.random(),
      x: Math.random() * window.innerWidth,
      duration: 8 + Math.random() * 7,
      intensity: txCount > 3 ? 'high' : 'normal'
    };
    setParticles(p => [...p.slice(-50), newParticle]); // max 50 on screen
  };

  const addGhost = () => {
    const ghost = {
      id: Date.now(),
      x: Math.random() * 80 + 10,
      duration: 15
    };
    setGhosts(g => [...g, ghost]);
    const shhh = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUX+');
    shhh.volume = 0.3; shhh.play().catch(() => {});
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
      const block = await res.json();
      const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
      const txs = await txRes.json();

      if (!latest || block.height > latest.height) {
        setLatest(block);
        setRecentBlocks(prev => [block, ...prev.slice(0, 7)]);
        addParticle(txs.length);
        if (txs.length > 0) addGhost();
        if (txs.length > 5) {
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 }, colors: ['#ff00ff', '#00ffff', '#ffd700'] });
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 7000);
    return () => clearInterval(id);
  }, [latest]);

  if (loading) return <div className="loading glitch" data-text="ENTERING THE SHADOWS...">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {/* Floating Particles */}
      {particles.map(p => (
        <div key={p.id} className={`particle ${p.intensity}`} style={{ left: p.x, animationDuration: `${p.duration}s` }}></div>
      ))}

      {/* Privacy Ghosts */}
      {ghosts.map(g => (
        <div key={g.id} className="ghost" style={{ left: `${g.x}%`, animationDuration: `${g.duration}s` }}>Zero-Knowledge Ghost</div>
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
          <p className="txs">{(latest ? (await fetch(`${BASE_URL}/blocks/${latest.hash}/txs`, { headers: { project_id: API_KEY }}).then(r=>r.json()).then(t=>t.length)) : 0)} shielded transactions</p>
        </div>

        <div className="recent-blocks">
          {recentBlocks.slice(1).map(b => (
            <div key={b.hash} className="mini-card">
              <span className="mini-height">#{b.height}</span>
              <span className="mini-txs">{b.tx_count || '?'} tx</span>
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
