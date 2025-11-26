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

  // Spawn new rain columns
  const spawnColumns = (txCount = 1) => {
    const count = Math.min(8 + txCount * 5, 45);
    const width = window.innerWidth;
    const columnWidth = 30;

    for (let i = 0; i < count; i++) {
      columnsRef.current.push({
        x: Math.random() * width,
        y: Math.random() * -100,
        speed: 2 + Math.random() * 4,
        length: 10 + Math.floor(Math.random() * 25),
        hue: Math.floor(Math.random() * 3),
        chars: Array(60).fill().map(() => chars[Math.floor(Math.random() * chars.length)])
      });
    }
  };

  useEffect(() => {
    spawnColumns(3);
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
    const int = setInterval(fetchData, 8000);
    return () => clearInterval(int);
  }, [latest]);

  // Canvas rain — PERFECT MATRIX
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00ffff', '#ff00ff', '#ffd700'];

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      columnsRef.current.forEach(col => {
        col.y += col.speed * 2.5;

        // Draw tail
        for (let i = 1; i <= col.length; i++) {
          const charIndex = Math.floor(Date.now() / 120 + i) % col.chars.length;
          const opacity = Math.max(0.1, 1 - i / col.length * 0.8);
          ctx.globalAlpha = opacity;
          ctx.fillStyle = colors[col.hue];
          ctx.shadowColor = colors[col.hue];
          ctx.shadowBlur = 8;
          ctx.font = '18px monospace';
          ctx.fillText(col.chars[charIndex], col.x, col.y - i * 22);
        }

        // White head — always at the front
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 40;
        ctx.font = '26px monospace';
        ctx.fillText('█', col.x, col.y);
      });

      columnsRef.current = columnsRef.current.filter(c => c.y < canvas.height + 600);
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
      {/* REAL MATRIX RAIN — BEHIND UI */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
          background: 'transparent'
        }}
      />

      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

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
