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

  const spawnColumns = (txCount = 1) => {
    const count = Math.min(10 + txCount * 6, 50);
    for (let i = 0; i < count; i++) {
      columnsRef.current.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -1000,
        speed: 2 + Math.random() * 4,
        length: 12 + Math.floor(Math.random() * 28),
        hue: i % 3
      });
    }
    columnsRef.current = columnsRef.current.slice(-500);
  };

  useEffect(() => {
    spawnColumns(5);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY } });
        const block = await res.json();
        const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY } });
        const txs = await txRes.json();

        if (!latest || latest.hash !== block.hash) {
          setLatest(block);
          setRecentBlocks(prev => [block, ...prev].slice(0, 50));
          spawnColumns(txs.length || 2);
          if (txs.length > 0) {
            setShieldedFloats(prev => [...prev, { id: Date.now(), left: 10 + Math.random() * 80 }].slice(-12));
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  // THE FIXED CANVAS RAIN — PERFECT
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
      // THIS WAS THE BUG — was filling with black → gray overlay
      // Now: only fade previous frame slightly, no gray!
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      columnsRef.current.forEach(col => {
        col.y += col.speed * 2.8;

        // Tail
        for (let i = 1; i <= col.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const opacity = Math.max(0.08, 1 - i / col.length);
          ctx.globalAlpha = opacity;
          ctx.fillStyle = colors[col.hue];
          ctx.shadowColor = colors[col.hue];
          ctx.shadowBlur = 12;
          ctx.font = '20px monospace';
          ctx.fillText(char, col.x, col.y - i * 25);
        }

        // White head — bright and leading
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 50;
        ctx.font = '30px monospace';
        ctx.fillText('█', col.x, col.y);
      });

      columnsRef.current = columnsRef.current.filter(c => c.y < canvas.height + 1000);
      requestAnimationFrame(draw);
    };

    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="App" style={{ background: '#000', position: 'relative', minHeight: '100vh' }}>
      {/* CANVAS RAIN — NOW VISIBLE, NO GRAY OVERLAY */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* SHIELDED WORDS */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

      {/* YOUR UI — ON TOP, CRYSTAL CLEAR */}
      <div className="main-layout" style={{ position: 'relative', zIndex: 10 }}>
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
  );
}

export default App;
