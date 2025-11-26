import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [particles, setParticles] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [liveTxs, setLiveTxs] = useState([]);
  const [epochEndTime, setEpochEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  const addParticle = (count) => {
    for (let i = 0; i < Math.min(count * 3, 25); i++) {
      setTimeout(() => {
        setParticles(p => [...p, { id: Date.now() + i, left: Math.random() * 100 }].slice(-100));
      }, i * 100);
    }
  };

  const spawnShieldedFloat = () => {
    const id = Date.now();
    const left = 10 + Math.random() * 80;
    setShieldedFloats(prev => [...prev, { id, left }].slice(-10));
  };

  const spawnLiveTx = (txHash) => {
    const id = Date.now();
    const start = Math.random() * 80 + 10;
    const end = start + (Math.random() > 0.5 ? 1 : -1) * 40;
    setLiveTxs(prev => [...prev, { id, start, end, hash: txHash.slice(0, 12) }].slice(-12));
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

      // Fetch epoch end time
      const epochRes = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
      if (epochRes.ok) {
        const epoch = await epochRes.json();
        setEpochEndTime(epoch.end_time * 1000);
      }

      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!epochEndTime) return;
    const interval = setInterval(() => {
      const diff = epochEndTime - Date.now();
      if (diff <= 0) {
        setTimeLeft("EPOCH ENDED");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [epochEndTime]);

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
              <span><strong>{recentBlocks.length}</strong> blocks seen</span>
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
