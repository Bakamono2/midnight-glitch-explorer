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

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    document.head.appendChild(meta);
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />

      {/* MAIN DASHBOARD — PERFECT ON EVERY RESOLUTION */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        padding: '2vh 4vw',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        pointerEvents: 'none'
      }}>
        {/* TOP: Title + Main Card + Epoch */}
        <div style={{ pointerEvents: 'auto', textAlign: 'center' }}>
          <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
          <p className="subtitle" data-text="EXPLORER">EXPLORER</p>

          <div className="main-card" style={{ margin: '3vh auto', maxWidth: '680px', padding: '2rem', borderRadius: '12px', background: 'rgba(0,0,0,0.6)', border: '2px solid #0ff', boxShadow: '0 0 30px #0ff' }}>
            <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
            <p className="block-num">#{latest?.height || '...'}</p>
            <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
            <p className="txs">{recentBlocks[0]?.tx_count || 0} transactions</p>
          </div>

          <div className="epoch-countdown" style={{ marginTop: '2vh', fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)', color: '#0ff' }}>
            EPOCH ENDS IN <span className="timer">{timeLeft}</span>
          </div>
        </div>

        {/* BOTTOM: Footer left + Timeline right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'auto' }}>
          <footer>
            <p style={{ margin: 0, opacity: 0.8 }}>
              <span className="glitch" data-text="shhh...">shhh...</span> nothing ever happened
            </p>
          </footer>

          {/* Timeline — fixed width, max height, scrollable */}
          <div style={{
            width: '340px',
            maxHeight: '58vh',
            overflowY: 'auto',
            padding: '1rem',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '12px',
            border: '1px solid #0ff33',
            boxShadow: '0 0 20px rgba(0,255,255,0.2)'
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
      </div>

      {/* SHIELDED floating words */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}
    </>
  );
}

export default App;
