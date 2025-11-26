import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [rainColumns, setRainColumns] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  // Beautiful original color cycle: cyan → magenta → gold
  const colors = ['#00ffff', '#ff00ff', '#ffd700'];

  const addMatrixRain = (count) => {
    const newColumns = [];
    for (let i = 0; i < Math.min(count * 4, 35); i++) {
      const length = 15 + Math.floor(Math.random() * 25); // long columns
      const column = Array(length).fill(0).map(() => 
        String.fromCharCode(0x30A0 + Math.random() * 96)
      ).join('');
      
      newColumns.push({
        id: Date.now() + i + Math.random(),
        left: Math.random() * 100,
        text: column,
        color: colors[i % 3],
        speed: 3 + Math.random() * 4 // varied fall speed
      });
    }
    setRainColumns(prev => [...prev, ...newColumns].slice(-120));
  };

  const spawnShielded = () => {
    setShieldedFloats(prev => [...prev, {
      id: Date.now() + Math.random(),
      left: 10 + Math.random() * 80
    }].slice(-10));
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
      if (!res.ok) return;
      const block = await res.json();
      const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
      if (!txRes.ok) return;
      const txs = await txRes.json();

      if (!latest || latest.hash !== block.hash) {
        const txCount = txs.length;
        setLatest(block);
        setRecentBlocks(prev => [block, ...prev.filter(b => b.hash !== block.hash)].slice(0, 50));
        addMatrixRain(txCount);
        if (txCount > 0) spawnShielded();
        if (txCount > 8) {
          confetti({ particleCount: 400, spread: 180, origin: { y: 0.25 }, colors: ['#00ffff','#ff00ff','#ffd700','#39ff14'] });
        }
      }
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  // Epoch countdown
  useEffect(() => {
    let epochEnd = null;
    const fetchEpoch = async () => {
      try {
        const r = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
        if (r.ok) {
          const e = await r.json();
          epochEnd = e.end_time * 1000;
        }
      } catch {}
    };
    fetchEpoch();

    const timer = setInterval(() => {
      if (!epochEnd) { setTimeLeft('Loading...'); return; }
      const diff = epochEnd - Date.now();
      if (diff <= 0) { setTimeLeft('EPOCH ENDED'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
    const int = setInterval(fetchData, 7000);
    return () => clearInterval(int);
  }, [latest]);

  if (loading) return <div className="loading">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {/* TRUE VERTICAL MATRIX RAIN — cyan/magenta/gold */}
      {rainColumns.map(col => (
        <div
          key={col.id}
          className="matrix-rain"
          style={{
            left: `${col.left}%`,
            color: col.color,
            textShadow: `0 0 10px ${col.color}, 0 0 20px ${col.color}`,
            animationDuration: `${col.speed}s`
          }}
        >
          {col.text}
        </div>
      ))}

      {/* SHIELDED falling words */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

      <div className="main-layout">
        <div className="dashboard">
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

            <div className="epoch-countdown">
              EPOCH ENDS IN <span className="timer">{timeLeft}</span>
            </div>

            <div className="stats-bar">
              <span><strong>{recentBlocks.length}</strong> blocks</span>
              <span><strong>{shieldedFloats.length}</strong> SHIELDED events</span>
            </div>
          </main>

          <footer>
            <p><span className="glitch" data-text="shhh...">shhh...</span> nothing ever happened</p>
          </footer>
        </div>

        <div className="timeline">
          {recentBlocks.map((b, i) => (
            <div key={b.hash} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>
              <span className="height">#{b.height}</span>
              <span className="txs">{b.tx_count || 0} tx</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
