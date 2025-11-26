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
  const columnsRef = useRef([]);

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // PERFECT SCALING BASED ON SCREEN AREA (works on tall monitors!)
  const getScale = () => {
    const area = window.innerWidth * window.innerHeight;
    const referenceArea = 1920 * 1080;
    return Math.sqrt(area / referenceArea); // area-based scaling = perfect density
  };

  const spawnOneColumnPerTx = (txCount) => {
    const scale = getScale();
    const safeMargin = 160 * scale;

    for (let i = 0; i < txCount; i++) {
      columnsRef.current.push({
        x: safeMargin + Math.random() * (window.innerWidth - 2 * safeMargin),
        y: -200 - Math.random() * 600,
        speed: (0.7 + Math.random() * 1.1) * scale,
        length: Math.floor(20 + Math.random() * 35),
        headPos: Math.random() * 8,
        hue: i % 3
      });
    }
    // Keep reasonable column count — scales with screen size
    columnsRef.current = columnsRef.current.slice(-Math.floor(1200 * scale));
  };

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
          if (txCount > 0) {
            setShieldedFloats(prev => [...prev, { id: Date.now(), left: 10 + Math.random() * 80 }].slice(-12));
          }
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

  // FINAL RESPONSIVE RAIN — PERFECT ON TALL MONITORS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#00ff99', '#00ffcc', '#00ffff'];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scale = getScale();
      const baseFontSize = 28 * scale;
      const charSpacing = 35 * scale;
      const glowSize = 120 * scale;

      ctx.font = `${baseFontSize}px "Matrix Code NFI", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      columnsRef.current.forEach(col => {
        col.y += col.speed;
        col.headPos += 0.3;

        for (let i = 0; i <= col.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const distance = Math.abs(i - col.headPos);
          const brightness = distance < 1 ? 1.0 : distance < 3 ? 0.8 : Math.max(0.08, 1 - i / col.length);

          ctx.globalAlpha = brightness;

          if (brightness > 0.9) {
            ctx.fillStyle = 'white';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = glowSize;
            ctx.fillText(char, col.x, col.y - i * charSpacing);
            ctx.fillText(char, col.x, col.y - i * charSpacing);
          } else {
            ctx.fillStyle = colors[col.hue];
            ctx.shadowColor = colors[col.hue];
            ctx.shadowBlur = 22 * scale;
            ctx.fillText(char, col.x, col.y - i * charSpacing);
          }
        }
      });

      columnsRef.current = columnsRef.current.filter(c => c.y < canvas.height + 4000 * scale);
      requestAnimationFrame(draw);
    };

    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  // Mobile viewport lock
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);
  }, []);

  return (
    <div style={{ background: '#000', position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      />

      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

      <div style={{ position: 'relative', zIndex: 10, padding: 'max(2rem, 4vh) max(2rem, 4vw)' }}>
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
    </div>
  );
}

export default App;
