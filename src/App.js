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
  const [liveTxs, setLiveTxs] = useState([]); // ← NEW: flying transactions
  const [epochEndTime, setEpochEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(true);

  const addParticle = (count) => {
    for (let i = 0; i < Math.min(count * 4, 30); i++) {
      setTimeout(() => {
        setParticles(p => [...p, { id: Date.now() + Math.random(), left: Math.random() * 100 }].slice(-120));
      }, i * 80);
    }
  };

  const spawnShieldedFloat = () => {
    const id = Date.now() + Math.random();
    const left = 10 + Math.random() * 80;
    setShieldedFloats(prev => [...prev, { id, left }].slice(-12));
  };

  // NEW: Flying live transaction shards
  const spawnLiveTx = (txHash, txCount) => {
    const id = Date.now() + Math.random();
    const start = Math.random() * 100;
    const end = start + (Math.random() > 0.5 ? 1 : -1) * 35;
    const color = txCount > 3 ? '#ffd700' : '#00ffff';
    setLiveTxs(prev => [...prev, { id, start, end, color, hash: txHash.slice(0, 12) }].slice(-15));
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
      if (!res.ok) throw new Error('API error');
      const block = await res.json();
      const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
      if (!txRes.ok) throw new Error('Tx fetch failed');
      const txs = await txRes.json();

      if (!latest || block.hash !== latest.hash) {
        const txCount = txs.length;
        setLatest(block);
        setRecentBlocks(prev => {
          const filtered = prev.filter(b => b.hash !== block.hash);
          return [block, ...filtered].slice(0, 50);
        });
        addParticle(txCount);
        if (txCount > 0) {
          spawnShieldedFloat();
          txs.forEach(tx => spawnLiveTx(tx.hash, txCount));
        }

        if (txCount > 10) {
          confetti({ particleCount: 400, spread: 180, origin: { y: 0.25 }, colors: ['#ffd700', '#ff00ff', '#00ffff', '#39ff14'] });
        }

        // Epoch countdown
        const epochRes = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
        if (epochRes.ok) {
          const epoch = await epochRes.json();
          setEpochEndTime(epoch.end_time * 1000); // convert to ms
        }
      }
      setLoading(false);
    } catch (e) {
      console.error("Error:", e);
      setLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!epochEndTime) return;
    const timer = setInterval(() => {
      const diff = epochEndTime - Date.now();
      if (diff <= 0) {
        setTimeLeft("EPOCH ENDING NOW");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [epochEndTime]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6500);
    return () => clearInterval(interval);
  }, [latest]);

  if (loading) return <div className="loading glitch" data-text="ENTERING THE SHADOWS...">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {/* Rain */}
      {particles.map(p => <div key={p.id} className="rain" style={{ left: `${p.left}%` }}></div>)}

      {/* SHIELDED falling */}
      {shieldedFloats.map(f => <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>SHIELDED</div>)}

      {/* LIVE FLYING TRANSACTIONS */}
      {liveTxs.map(tx => (
        <div
          key={tx.id}
          className="live-tx"
          style={{
            '--start': `${tx.start}%`,
            '--end': `${tx.end}%`,
            borderColor: tx.color,
            boxShadow: `0 0 20px ${tx.color}`
          }}
        >
          {tx.hash}...
        </div>
      ))}

      <div className="main-layout">
        <div className="dashboard">
          <header className="header">
            <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
            <p className="subtitle centered" data-text="EXPLORER">EXPLORER</p>
          </header>

          <main>
            <div className="card main-card">
              <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
              <p className="block-num">#{latest?.height || '???'}</p>
              <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
              <p className="txs">{latest ? recentBlocks[0]?.tx_count || 0 : 0} shielded transactions</p>
            </div>

            {/* EPOCH COUNTDOWN */}
            <div className="epoch-countdown">
              EPOCH ENDS IN <span className="timer">{timeLeft || 'Loading...'}</span>
            </div>

            <div className="stats-bar">
              <span><strong>{((recentBlocks[0]?.height - recentBlocks[recentBlocks.length-1]?.height) / ((recentBlocks.length-1) * 6.5))?.toFixed(2) || '0.00'}</strong> TPS</span>
              <span><strong>{recentBlocks.length}</strong> blocks</span>
              <span><strong>{liveTxs.length}</strong> live events</span>
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
