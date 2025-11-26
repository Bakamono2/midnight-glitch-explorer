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

  const canvasRef = useRef(null);
  const dropsRef = useRef([]);

  const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

  const spawnDrop = (txIntensity = 1) => {
    const count = Math.min(4 + txIntensity * 6, 40);
    for (let i = 0; i < count; i++) {
      dropsRef.current.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -800,
        speed: 2 + Math.random() * 4,
        length: 10 + Math.floor(Math.random() * 30),
        hue: Math.floor(Math.random() * 3),
        chars: Array(50).fill().map(() => matrixChars[Math.floor(Math.random() * matrixChars.length)])
      });
    }
  };

  useEffect(() => {
    spawnDrop(3); // Initial rain
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
          spawnDrop(txs.length);
          if (txs.length > 0) {
            setShieldedFloats(prev => [...prev, { id: Date.now(), left: 10 + Math.random() * 80 }].slice(-12));
          }
          if (txs.length > 20) confetti({ particleCount: 800, spread: 180, origin: { y: 0.3 }, colors: ['#00ffff','#ff00ff','#ffd700','#39ff14'] });
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

  // REAL MATRIX RAIN — CANVAS
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00ffff', '#ff00ff', '#ffd700'];

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      dropsRef.current = dropsRef.current.filter(d => d.y < canvas.height + 1000);

      dropsRef.current.forEach(drop => {
        drop.y += drop.speed * 3;

        // Draw tail
        for (let i = 1; i < drop.length; i++) {
          const charIndex = Math.floor((Date.now() / 150 + i) % drop.chars.length);
          ctx.globalAlpha = Math.max(0.1, 1 - i / drop.length);
          ctx.fillStyle = colors[drop.hue];
          ctx.shadowColor = colors[drop.hue];
          ctx.shadowBlur = 10;
          ctx.font = '18px monospace';
          ctx.fillText(drop.chars[charIndex], drop.x, drop.y - i * 22);
        }

        // White head
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 40;
        ctx.font = '24px monospace';
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
      {/* REAL MATRIX RAIN — BEHIND EVERYTHING */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />

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
