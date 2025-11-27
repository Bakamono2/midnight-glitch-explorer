import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');

  const canvasRef = useRef(null);
  const columnsRef = useRef([]);

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const getScale = () => {
    const area = window.innerWidth * window.innerHeight;
    const ref = 1920 * 1080;
    return Math.sqrt(area / ref);
  };

  const spawnOneColumnPerTx = (txCount) => {
    const scale = getScale();
    const margin = 160 * scale;
    for (let i = 0; i < txCount; i++) {
      columnsRef.current.push({
        x: margin + Math.random() * (window.innerWidth - 2 * margin),
        y: -200 - Math.random() * 600,
        speed: (0.7 + Math.random() * 1.1) * scale,
        length: 20 + Math.floor(Math.random() * 35),
        headPos: Math.random() * 8,
        hue: i % 3
      });
    }
    columnsRef.current = columnsRef.current.slice(-Math.floor(1200 * scale));
  };

  // ← All useEffects unchanged (fetching, epoch, canvas) — only z-index fixed below

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY } });
        const block = await res.json();
        const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY } });
        const txs = await txRes.json();

        if (!latest || latest.hash !== block.hash) {
          const txCount = txs.length;
          setLatest(block);
          setRecentBlocks(prev => [block, ...prev].slice(0, 50));
          spawnOneColumnPerTx(txCount);
          if (txCount > 0) setShieldedFloats(prev => [...prev, { id: Date.now(), left: 10 + Math.random() * 80 }].slice(-12));
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  useEffect(() => {
    let epochEnd = null;
    const fetchEpoch = async () => {
      try {
        const r = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY } });
        const e = await r.json();
        epochEnd = e.end_time * 1000;
      } catch {}
    };
    fetchEpoch();
    const timer = setInterval(() => {
      if (!epochEnd) return setTimeLeft('Loading...');
      const diff = epochEnd - Date.now();
      if (diff <= 0) return setTimeLeft('EPOCH ENDED');
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#00ff99', '#00ffcc', '#00ffff'];
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = getScale();
      const fontSize = 28 * scale;
      const spacing = 35 * scale;
      const glow = 120 * scale;

      ctx.font = `${fontSize}px "Matrix Code NFI", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      columnsRef.current.forEach(col => {
        col.y += col.speed;
        col.headPos += 0.3;
        for (let i = 0; i <= col.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const dist = Math.abs(i - col.headPos);
          const bright = dist < 1 ? 1 : dist < 3 ? 0.8 : Math.max(0.08, 1 - i / col.length);
          ctx.globalAlpha = bright;
          if (bright > 0.9) {
            ctx.fillStyle = 'white';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = glow;
            ctx.fillText(char, col.x, col.y - i * spacing);
            ctx.fillText(char, col.x, col.y - i * spacing);
          } else {
            ctx.fillStyle = colors[col.hue];
            ctx.shadowColor = colors[col.hue];
            ctx.shadowBlur = 22 * scale;
            ctx.fillText(char, col.x, col.y - i * spacing);
          }
        }
      });
      columnsRef.current = columnsRef.current.filter(c => c.y < canvas.height + 4000 * scale);
      requestAnimationFrame(draw);
    };
    draw();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      {/* Digital Rain — background */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      {/* Dashboard — foreground, zIndex 10 */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        {/* Title */}
        <h1 className="glitch-title" data-text="MIDNIGHT" style={{ position: 'absolute', top: '6vh', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
          MIDNIGHT
        </h1>
        <p className="subtitle" data-text="EXPLORER" style={{ position: 'absolute', top: '18vh', left: '50%', transform: 'translateX(-50%)' }}>
          EXPLORER
        </p>

        {/* Main Card */}
        <div className="main-card" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(720px, 88vw)', pointerEvents: 'auto' }}>
          <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
          <p className="block-num">#{latest?.height || '...'}</p>
          <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
          <p className="txs">{recentBlocks[0]?.tx_count || 0} transactions</p>
        </div>

        {/* Epoch Clock */}
        <div style={{
          position: 'absolute',
          bottom: '14vh',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          padding: '0.8rem 2.5rem',
          borderRadius: '50px',
          border: '2px solid #f0f',
          boxShadow: '0 0 30px #f0f',
          fontSize: 'clamp(1.4rem, 3vw, 2.4rem)',
          whiteSpace: 'nowrap'
        }}>
          EPOCH ENDS IN <span className="timer">{timeLeft}</span>
        </div>

        {/* Footer */}
        <footer style={{ position: 'absolute', bottom: '4vh', left: '50%', transform: 'translateX(-50%)', opacity: 0.7 }}>
          <p style={{ margin: 0 }}><span className="glitch" data-text="shhh...">shhh...</span> nothing ever happened</p>
        </footer>

        {/* Timeline — fixed width, no overlap */}
        <div style={{
          position: 'absolute',
          top: '12vh',
          right: '3vw',
          width: '340px',
          maxHeight: '72vh',
          overflowY: 'auto',
          background: 'rgba(0,10,30,0.7)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #0ff',
          boxShadow: '0 0 25px rgba(0,255,255,0.3)',
          pointerEvents: 'auto'
        }}>
          <div className="timeline">
            {recentBlocks.slice(0, 30).map((b, i) => (
              <div key={b.hash} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>
                <span className="height">#{b.height}</span>
                <span className="txs">{b.tx_count || 0} tx</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shielded Text */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%`, zIndex: 5 }}>
          SHIELDED
        </div>
      ))}
    </>
  );
}

export default App;
