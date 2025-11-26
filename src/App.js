import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY || "preprodj7f4c0q8vE8qY8n7p5r2v9x0k3t1y6m4";
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');

  const canvasRef = useRef(null);
  const dropsRef = useRef([]);

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

  // Spawn rain — always visible, transaction-powered
  const spawnRain = (txCount = 1) => {
    const count = Math.max(10, txCount * 8);
    for (let i = 0; i < count; i++) {
      dropsRef.current.push({
        x: Math.random() * (window.innerWidth + 300) - 150,
        y: Math.random() * -1000,
        speed: 3 + Math.random() * 5,
        fontSize: 16 + Math.random() * 12,
        length: 15 + Math.random() * 35,
        hue: i % 3
      });
    }
    dropsRef.current = dropsRef.current.slice(-600);
  };

  const spawnShielded = () => {
    setShieldedFloats(prev => [...prev, {
      id: Date.now() + Math.random(),
      left: 10 + Math.random() * 80
    }].slice(-15));
  };

  // Initial rain + fallback
  useEffect(() => {
    spawnRain(4);
    const fallback = setInterval(() => spawnRain(3), 30000);
    return () => clearInterval(fallback);
  }, []);

  // Live block polling
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY } });
        const block = await res.json();
        const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY } });
        const txs = await txRes.json();

        if (!latest || latest.hash !== block.hash) {
          setLatest(block);
          setRecentBlocks(prev => [block, ...prev.filter(b => b.hash !== block.hash)].slice(0, 50));
          spawnRain(txs.length || 2);
          if ((txs.length || 0) > 0) spawnShielded();
          if ((txs.length || 0) > 15) {
            confetti({ particleCount: 700, spread: 200, origin: { y: 0.3 }, colors: ['#00ffff','#ff00ff','#ffd700','#39ff14'] });
          }
        }
      } catch (e) { console.error(e); }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  // Epoch countdown
  useEffect(() => {
    const updateTimer = async () => {
      try {
        const r = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY } });
        const epoch = await r.json();
        const endTime = epoch.end_time * 1000;
        const timer = setInterval(() => {
          const diff = endTime - Date.now();
          if (diff <= 0) { setTimeLeft('EPOCH ENDED'); return; }
          const d = Math.floor(diff / 86400000);
          const h = Math.floor((diff % 86400000) / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
        }, 1000);
        return () => clearInterval(timer);
      } catch {}
    };
    updateTimer();
  }, []);

  // Canvas Matrix Rain — behind UI, always visible
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00ffff', '#ff00ff', '#ffd700'];

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      dropsRef.current = dropsRef.current.filter(d => d.y < canvas.height + 500);

      dropsRef.current.forEach(drop => {
        drop.y += drop.speed * 3;

        ctx.font = `${drop.fontSize}px monospace`;

        // Trail
        for (let i = 0; i < drop.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          ctx.globalAlpha = Math.max(0.05, 1 - i / drop.length);
          ctx.fillStyle = colors[drop.hue];
          ctx.shadowColor = colors[drop.hue];
          ctx.shadowBlur = 10;
          ctx.fillText(char, drop.x, drop.y - i * drop.fontSize * 1.3);
        }

        // White head
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 40;
        ctx.fillText('█', drop.x, drop.y);
      });

      requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="App">
      {/* PERFECT MATRIX RAIN — behind everything */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,                 // ← behind UI
          pointerEvents: 'none',
          background: 'transparent'
        }}
      />

      {/* SHIELDED words */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

      {/* Your beautiful UI — fully visible */}
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
