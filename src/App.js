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
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  // Matrix character set
  const matrixChars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Generate Matrix rain columns when a new block appears
  const addParticles = (count) => {
    const newColumns = [];
    for (let i = 0; i < Math.min(count * 3, 30); i++) {
      const length = 8 + Math.floor(Math.random() * 15);
      const text = Array.from({ length }, () => 
        matrixChars[Math.floor(Math.random() * matrixChars.length)]
      ).join('');

      newColumns.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        left: Math.random() * 100,
        text: text
      });
    }
    setParticles(prev => [...prev, ...newColumns].slice(-120));
  };

  // SHIELDED falling word
  const spawnShielded = () => {
    setShieldedFloats(prev => [...prev, {
      id: Date.now() + Math.random(),
      left: 10 + Math.random() * 80
    }].slice(-10));
  };

  // Fetch latest block + transactions
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
        addParticles(txCount);
        if (txCount > 0) spawnShielded();
        if (txCount > 8) {
          confetti({ particleCount: 400, spread: 180, origin: { y: 0.25 }, colors: ['#00ff41', '#00ffff', '#ff00ff', '#ffffff'] });
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Epoch countdown — one safe interval
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
      if (!epochEnd) {
        setTimeLeft('Loading...');
        return;
      }
      const diff = epochEnd - Date.now();
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

  // Polling
  useEffect(() => {
    fetchData();
    const int = setInterval(fetchData, 7000);
    return () => clearInterval(int);
  }, [latest]);

  if (loading) return <div className="loading">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {/* Matrix Digital Rain */}
      {particles.map(p => (
        <div key={p.id} className="rain" style={{ left: `${p.left}%` }}>
          {p.text}
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
