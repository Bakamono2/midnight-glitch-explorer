import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

// Global counters — eliminate duplicate key crashes forever
let particleId = 0;
let shieldedId = 0;
let txId = 0;

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [particles, setParticles] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [liveTxs, setLiveTxs] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  // Safe particle rain
  const addParticles = (count) => {
    const newParticles = [];
    for (let i = 0; i < Math.min(count * 3, 30); i++) {
      newParticles.push({ id: ++particleId, left: Math.random() * 100 });
    }
    setParticles(p => [...p, ...newParticles].slice(-120));
  };

  // Safe SHIELDED fall
  const spawnShielded = () => {
    setShieldedFloats(prev => [...prev, { id: ++shieldedId, left: 10 + Math.random() * 80 }].slice(-12));
  };

  // Safe flying transactions
  const spawnLiveTx = (hash) => {
    setLiveTxs(prev => [...prev, {
      id: ++txId,
      start: 5 + Math.random() * 90,
      end: 5 + Math.random() * 90,
      hash: hash.slice(0, 12)
    }].slice(-15));
  };

  // Main data fetch
  const fetchData = async () => {
    try {
      const blockRes = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
      if (!blockRes.ok) return;
      const block = await blockRes.json();

      const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
      if (!txRes.ok) return;
      const txs = await txRes.json();

      if (!latest || latest.hash !== block.hash) {
        const txCount = txs.length;
        setLatest(block);
        setRecentBlocks(prev => [block, ...prev.filter(b => b.hash !== block.hash)].slice(0, 50));

        addParticles(txCount);
        if (txCount > 0) {
          spawnShielded();
          txs.forEach(tx => spawnLiveTx(tx.hash));
        }
        if (txCount > 10) {
          confetti({ particleCount: 400, spread: 180, origin: { y: 0.25 }, colors: ['#ffd700','#ff00ff','#00ffff','#39ff14'] });
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Epoch countdown — ONE interval only, no leaks
  useEffect(() => {
    let epochEndMs = null;

    const fetchEpoch = async () => {
      try {
        const res = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
        if (res.ok) {
          const epoch = await res.json();
          epochEndMs = epoch.end_time * 1000;
        }
      } catch (e) { console.error(e); }
    };

    fetchEpoch();

    const timer = setInterval(() => {
      if (!epochEndMs) {
        setTimeLeft('Loading...');
        return;
      }
      const diff = epochEndMs - Date.now();
      if (diff <= 0) {
        setTimeLeft('EPOCH ENDED');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Block polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, [latest]);

  if (loading) return <div className="loading">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {particles.map(p => <div key={p.id} className="rain" style={{ left: `${p.left}%` }}></div>)}
      {shieldedFloats.map(f => <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>SHIELDED</div>)}
      {liveTxs.map(tx => (
        <div key={tx.id} className="live-tx" style={{ '--start': `${tx.start}%`, '--end': `${tx.end}%` }}>
          {tx.hash}...
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
              <p className="txs">{recentBlocks[0]?.tx_count || 0} shielded txs</p>
            </div>

            <div className="epoch-countdown">
              EPOCH ENDS IN <span className="timer">{timeLeft}</span>
            </div>

            <div className="stats-bar">
              <span><strong>{recentBlocks.length}</strong> blocks</span>
              <span><strong>{liveTxs.length}</strong> live txs</span>
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
