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

  const spawnOneColumnPerTx = (txCount) => {
    for (let i = 0; i < txCount; i++) {
      columnsRef.current.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -1800,
        speed: 0.35 + Math.random() * 0.65,
        length: 22 + Math.floor(Math.random() * 38),
        headPos: Math.random() * 10,
        hue: i % 3,
        charCache: Array(60).fill().map(() => chars[Math.floor(Math.random() * chars.length)]), // pre-generate
        lastCharChange: Date.now()
      });
    }
    columnsRef.current = columnsRef.current.slice(-1200);
  };

  useEffect(() => { spawnOneColumnPerTx(6); }, []);

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

      const now = Date.now();

      columnsRef.current.forEach(col => {
        col.y += col.speed;
        col.headPos += 0.25;

        // Slow character change — every ~800ms instead of every frame
        if (now - col.lastCharChange > 800) {
          col.charCache = col.charCache.map(() => chars[Math.floor(Math.random() * chars.length)]);
          col.lastCharChange = now;
        }

        for (let i = 0; i <= col.length; i++) {
          const distance = Math.abs(i - col.headPos);
          const brightness = distance < 1 ? 1.0 : distance < 3 ? 0.85 : Math.max(0.07, 1 - i / col.length);

          const char = col.charCache[i] || chars[0];

          ctx.globalAlpha = brightness;
          ctx.font = '30px "Matrix Code NFI", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (brightness > 0.9) {
            // EXTREME WHITE GLOW — THIS IS THE ONE
            ctx.fillStyle = 'white';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 140;

            // Multi-layer glow
            ctx.fillText(char, col.x, col.y - i * 36);
            ctx.shadowBlur = 80;
            ctx.fillText(char, col.x, col.y - i * 36);
            ctx.shadowBlur = 40;
            ctx.fillText(char, col.x, col.y - i * 36);

            // Radial gradient halo
            const gradient = ctx.createRadialGradient(col.x, col.y - i * 36, 0, col.x, col.y - i * 36, 120);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(col.x - 100, col.y - i * 36 - 100, 200, 200);
          } else {
            ctx.fillStyle = colors[col.hue];
            ctx.shadowColor = colors[col.hue];
            ctx.shadowBlur = 22;
            ctx.globalAlpha = brightness;
            ctx.fillText(char, col.x, col.y - i * 36);
          }
        }
      });

      columnsRef.current = columnsRef.current.filter(c => c.y < canvas.height + 2000);
      requestAnimationFrame(draw);
    };

    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="App" style={{ background: '#000', position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
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

      <div style={{ position: 'relative', zIndex: 10 }}>
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
    </div>
  );
}

export default App;
