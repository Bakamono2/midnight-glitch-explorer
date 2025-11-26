import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  const canvasRef = useRef(null);
  const dropsRef = useRef([]);

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

  const spawnRain = (txCount) => {
    const newDrops = [];
    const count = Math.min(txCount * 6, 100);   // a bit more intense

    for (let i = 0; i < count; i++) {
      newDrops.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -600,
        speed: 2.5 + Math.random() * 4,
        fontSize: 16 + Math.random() * 10,
        length: 12 + txCount * 2 + Math.random() * 25,
        hue: i % 3
      });
    }
    dropsRef.current = [...dropsRef.current, ...newDrops].slice(-500);
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
        spawnRain(txCount);
        if (txCount > 0) spawnShielded();
        if (txCount > 15) confetti({ particleCount: 700, spread: 200, origin: { y: 0.3 }, colors: ['#00ffff','#ff00ff','#ffd700','#39ff14'] });
      }
      setLoading(false);
    } catch (e) { console.error(e); }
  };

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

  // Canvas rain — fixed z-index
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00ffff', '#ff00ff', '#ffd700'];

    const animate = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      dropsRef.current = dropsRef.current.filter(d => d.y < canvas.height + 300);

      dropsRef.current.forEach(drop => {
        drop.y += drop.speed * 3;

        ctx.font = `${drop.fontSize}px monospace`;

        // trail
        for (let i = 0; i < drop.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          ctx.globalAlpha = Math.max(0, 1 - i / drop.length);
          ctx.fillStyle = colors[drop.hue];
          ctx.shadowColor = colors[drop.hue];
          ctx.shadowBlur = 12;
          ctx.fillText(char, drop.x, drop.y - i * drop.fontSize * 1.2);
        }

        // white head
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 40;
        ctx.fillText('█', drop.x, drop.y);
      });

      requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    fetchData();
    const int = setInterval(fetchData, 7000);
    return () => clearInterval(int);
  }, [latest]);

  if (loading) return <div className="loading">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {/* CANVAS RAIN — now visible! */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,           // ← this is the fix
          pointerEvents: 'none'
        }}
      />

      {/* Rest of your UI */}
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
