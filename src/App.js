import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [rainStreams, setRainStreams] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const spawnDigitalRain = (txCount) => {
    const streamsToSpawn = Math.min(txCount * 3, 45); // 1 tx = 3 streams, cap at 45

    const newStreams = [];
    for (let i = 0; i < streamsToSpawn; i++) {
      const columnLength = 25 + Math.floor(txCount * 2) + Math.floor(Math.random() * 30);

      newStreams.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        left: 1 + Math.random() * 98,
        length: columnLength,
        speed: 10 + Math.random() * 8, // 10–18 second fall
        delay: i * 0.08,
        hue: i % 3 // 0=cyan, 1=magenta, 2=gold
      });
    }

    setRainStreams(prev => [...prev, ...newStreams].slice(-120));
  };

  const spawnShielded = () => {
    setShieldedFloats(prev => [...prev, {
      id: Date.now() + Math.random(),
      left: 10 + Math.random() * 80
    }].slice(-12));
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

        spawnDigitalRain(txCount);
        if (txCount > 0) spawnShielded();
        if (txCount > 15) {
          confetti({ particleCount: 600, spread: 200, origin: { y: 0.3 }, colors: ['#00ffff','#ff00ff','#ffd700','#39ff14'] });
        }
      }
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  // Epoch countdown (unchanged)
  useEffect(() => {
    let epochEnd = null;
    const fetchEpoch = async () => {
      try {
        const r = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
        if (r.ok) { const e = await r.json(); epochEnd = e.end_time * 1000; }
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

  const getColor = (hue) => {
    if (hue === 0) return '#00ffff';
    if (hue === 1) return '#ff00ff';
    return '#ffd700';
  };

  return (
    <div className="App">
      {/* PERFECT DIGITAL RAIN 3.0 */}
      {rainStreams.map(stream => (
        <div
          key={stream.id}
          className="rain-stream"
          style={{
            left: `${stream.left}%`,
            '--speed': `${stream.speed}s`,
            '--delay': `${stream.delay}s`,
            '--color': getColor(stream.hue)
          }}
        >
          <MatrixColumn length={stream.length} />
        </div>
      ))}

      {/* SHIELDED words */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

      {/* Your existing UI */}
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

// Live animated Matrix column component
function MatrixColumn({ length }) {
  const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return (
    <>
      <span className="head-char">█</span>
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className="rain-char"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          {chars[Math.floor(Math.random() * chars.length)]}
        </span>
      ))}
    </>
  );
}

export default App;
