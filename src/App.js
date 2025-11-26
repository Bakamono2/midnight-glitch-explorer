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

  // ONE COLUMN PER TRANSACTION — EXACTLY
  const spawnOneColumnPerTx = (txCount) => {
    for (let i = 0; i < txCount; i++) {
      columnsRef.current.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -1200,
        speed: 2.5 + Math.random() * 3.5,
        length: 16 + Math.floor(Math.random() * 24),
        hue: i % 3,
        born: Date.now() // for future effects if needed
      });
    }
    // Keep only recent columns — prevents infinite growth
    columnsRef.current = columnsRef.current.slice(-800);
  };

  useEffect(() => {
    // Gentle ambient rain when idle
    spawnOneColumnPerTx(5);
  }, []);

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

          // ONE DROP PER TRANSACTION — THIS IS THE TRUTH
          spawnOneColumnPerTx(txCount);

          // SHIELDED word on every tx
          if (txCount > 0) {
            setShieldedFloats(prev => [...prev, { id: Date.now(), left: 10 + Math.random() * 80 }].slice(-12));
          }

          // Big blocks get celebration
          if (txCount > 25) {
            confetti({ particleCount: txCount * 20, spread: 120, origin: { y: 0.4 } });
          }
        }
      } catch (e) { console.error(e); }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  // EPOCH COUNTDOWN — WORKING
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

  // CANVAS RAIN — PERFECT, BLACK, ONE DROP = ONE TX
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

    const colors = ['#00ffff', '#ff00ff', '#ffd700'];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      columnsRef.current.forEach(col => {
        col.y += col.speed * 2.8;

        // Tail
        for (let i = 1; i <= col.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const opacity = Math.max(0.12, 1 - i / col.length);
          ctx.globalAlpha = opacity;
          ctx.fillStyle = colors[col.hue];
          ctx.shadowColor = colors[col.hue];
          ctx.shadowBlur = 14;
          ctx.font = '20px monospace';
          ctx.fillText(char, col.x, col.y - i * 25);
        }

        // White head
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 60;
        ctx.font = '32px monospace';
        ctx.fillText('█', col.x, col.y);
      });

      columnsRef.current = columnsRef.current.filter(c => c.y < canvas.height + 1200);
      requestAnimationFrame(draw);
    };

    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="App" style={{ background: '#000', position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
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
