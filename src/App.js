import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [rainDrops, setRainDrops] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

  const spawnRain = (txCount) => {
    const newDrops = [];
    const count = Math.min(6 + txCount * 3, 40); // 6–40 columns

    for (let i = 0; i < count; i++) {
      const length = 12 + Math.floor(Math.random() * 28);
      newDrops.push({
        id: Date.now() + i,
        x: Math.random() * 98 + 1,
        length,
        speed: 10 + Math.random() * 8,
        delay: Math.random() * 3,
        hue: i % 3
      });
    }
    setRainDrops(prev => [...prev, ...newDrops].slice(-80));
  };

  const spawnShielded = () => {
    setShieldedFloats(prev => [...prev, {
      id: Date.now(),
      left: 10 + Math.random() * 80
    }].slice(-12));
  };

  useEffect(() => {
    spawnRain(5); // Initial rain
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
        const block = await res.json();
        const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
        const txs = await txRes.json();

        if (!latest || latest.hash !== block.hash) {
          setLatest(block);
          setRecentBlocks(prev => [block, ...prev].slice(0, 50));
          spawnRain(txs.length);
          if (txs.length > 0) spawnShielded();
          if (txs.length > 15) confetti({ particleCount: 600, spread: 180, origin: { y: 0.35 }, colors: ['#00ffff','#ff00ff','#ffd700','#39ff14'] });
        }
      } catch (e) { console.error(e); }
    };

    fetchData();
    const int = setInterval(fetchData, 8000);
    return () => clearInterval(int);
  }, [latest]);

  // Epoch timer
  useEffect(() => {
    const update = async () => {
      try {
        const r = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
        const e = await r.json();
        const end = e.end_time * 1000;
        const timer = setInterval(() => {
          const diff = end - Date.now();
          if (diff <= 0) return setTimeLeft('EPOCH ENDED');
          const d = Math.floor(diff / 86400000);
          const h = Math.floor((diff % 86400000) / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
        }, 1000);
      } catch {}
    };
    update();
  }, []);

  const colors = ['#00ffff', '#ff00ff', '#ffd700'];

  return (
    <div className="App">
      {/* PERFECT MATRIX RAIN */}
      {rainDrops.map(drop => (
        <div
          key={drop.id}
          className="matrix-column"
          style={{
            left: `${drop.x}%`,
            '--duration': `${drop.speed}s`,
            '--delay': `${drop.delay}s`,
            '--color': colors[drop.hue]
          }}
        >
          <div className="head">█</div>
          {Array.from({ length: drop.length }, (_, i) => (
            <span
              key={i}
              style={{
                opacity: Math.max(0.1, 1 - i / drop.length),
                animationDelay: `${i * 0.05}s`
              }}
            >
              {chars[Math.floor(Math.random() * chars.length)]}
            </span>
          ))}
        </div>
      ))}

      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

      {/* Your UI */}
      <div className="main-layout">
        <div className="dashboard">
          <header className="header">
            <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
            <p className="subtitle" data-text="EXPLORER">EXPLORER</p>
          </header>
          <main>
            <div className="card main-card">
              <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
              <p className="block-num">#{latest?.height || '...'}</p>
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
