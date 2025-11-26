import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

let particleIdCounter = 0;
let shieldedIdCounter = 0;
let txIdCounter = 0;

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [particles, setParticles] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [liveTxs, setLiveTxs] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  const addParticle = (count) => {
    const newParticles = [];
    for (let i = 0; i < Math.min(count * 3, 25); i++) {
      newParticles.push({
        id: ++particleIdCounter,
        left: Math.random() * 100
      });
    }
    setParticles(p => [...p, ...newParticles].slice(-100));
  };

  const spawnShieldedFloat = () => {
    setShieldedFloats(prev => [...prev, { id: ++shieldedIdCounter, left: 10 + Math.random() * 80 }].slice(-10));
  };

  const spawnLiveTx = (txHash) => {
    setLiveTxs(prev => [...prev, {
      id: ++txIdCounter,
      start: 10 + Math.random() * 80,
      end: 10 + Math.random() * 80,
      hash: txHash.slice(0, 12)
    }].slice(-12));
  };

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
        addParticle(txCount);
        if (txCount > 0) {
          spawnShieldedFloat();
          txs.forEach(tx => spawnLiveTx(tx.hash));
        }
        if (txCount > 8) {
          confetti({ particleCount: 300, spread: 160, origin: { y: 0.3 }, colors: ['#ffd700', '#ff00ff', '#00ffff'] });
        }
      }

      // Epoch countdown (only fetch once per minute to be gentle)
      const epochRes = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
      if (epochRes.ok) {
        const epoch = await epochRes.json();
        const endMs = epoch.end_time * 1000;
        const updateTimer = () => {
          const diff = endMs - Date.now();
          if (diff <= 0) {
            setTimeLeft("EPOCH ENDED");
            return;
          }
          const d = Math.floor(diff / 86400000);
          const h = Math.floor((diff % 86400000) / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
        };
        updateTimer();
        // Update every second
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
      }

      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, []);

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
              <span><strong>{recentBlocks.length}</strong> recent blocks</span>
              <span><strong>{liveTxs.length}</strong> live txs flying</span>
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
