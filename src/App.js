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
  const [tps, setTps] = useState(0);
  const [totalTxToday, setTotalTxToday] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  // Ambient sound (toggleable)
  useEffect(() => {
    if (soundOn) {
      const audio = new Audio('data:audio/wav;base64,...'); // tiny 15s dark synth loop
      audio.loop = true;
      audio.volume = 0.15;
      audio.play().catch(() => {});
      return () => audio.pause();
    }
  }, [soundOn]);

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
        setRecentBlocks(prev => [block, ...prev].slice(0, 12));
        setTotalTxToday(t => t + txCount);
        addParticle(txCount);
        if (txCount > 0) spawnGhost();

        // TPS calculation (rough)
        const now = Date.now();
        setTps(prev => {
          const elapsed = (now - (prev.time || now)) / 1000;
          return { value: txCount / Math.max(elapsed, 1), time: now };
        });

        if (txCount > 8) {
          confetti({ particleCount: 300, spread: 160, origin: { y: 0.3 }, colors: ['#ffd700', '#ff00ff', '#00ffff'] });
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6500);
    return () => clearInterval(interval);
  }, [latest]);

  return (
    <div className={`App ${darkMode ? 'midnight' : 'dawn'}`}>
      {/* Background pulse */}
      <div className="pulse-bg"></div>

      {/* Encrypted rain */}
      {particles.map(p => <div key={p.id} className="rain" style={{ left: `${p.left}%` }}></div>)}

      {/* Ghosts */}
      {ghosts.map(g => (
        <div key={g.id} className="ghost" style={{ left: `${g.left}%` }}>
          Zero-Knowledge Ghost
        </div>
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
          <p className="txs">{latest ? recentBlocks[0]?.tx_count || 0 : 0} shielded transactions</p>
        </div>

        <div className="recent-blocks">
          {recentBlocks.slice(1, 9).map(b => (
            <div key={b.hash} className="mini-card">
              #{b.height} — {b.tx_count || 0} tx
            </div>
          ))}
        </div>

        <div className="stats-bar">
          <span>{tps.value?.toFixed(2) || '0.00'} tx/s</span>
          <span>{totalTxToday} today</span>
          <span>{ghosts.length} ghosts watching</span>
        </div>

        <div className="controls">
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? 'Dawn Mode' : 'Midnight Mode'}
          </button>
          <button onClick={() => setSoundOn(!soundOn)}>
            {soundOn ? 'Silence' : 'Sound'}
          </button>
        </div>
      </main>

      <footer>
        <p><span className="glitch" data-text="shhh...">shhh...</span> nothing ever happened</p>
      </footer>
    </div>
  );
}

export default App;
