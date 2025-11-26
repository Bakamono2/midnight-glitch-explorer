import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY || "preprod-your-key-here";
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');

  const canvasRef = useRef(null);
  const dropsRef = useRef([]);

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワンヰヱヲ0123456789';

  // Spawn new rain columns
  const spawnRain = (txCount = 1) => {
    const intensity = Math.min(5 + txCount * 4, 35);
    for (let i = 0; i < intensity; i++) {
      dropsRef.current.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -600,
        speed: 3 + Math.random() * 5,
        length: 8 + Math.floor(Math.random() * 25),
        hue: i % 3
      });
    }
    // Keep only last 400 drops
    if (dropsRef.current.length > 400) {
      dropsRef.current = dropsRef.current.slice(-400);
    }
  };

  // Initial rain
  useEffect(() => {
    spawnRain(4);
  }, []);

  // Block polling
  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY } });
        const block = await res.json();
        const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY } });
        const txs = await txRes.json();

        if (!latest || latest.hash !== block.hash) {
          setLatest(block);
          setRecentBlocks(prev => [block, ...prev].slice(0, 50));
          spawnRain(txs.length || 2);
          if (txs.length > 0) {
            setShieldedFloats(prev => [...prev, { id: Date.now(), left: 10 + Math.random() * 80 }].slice(-12));
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  // Canvas rain — THE REAL ONE
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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      dropsRef.current.forEach(drop => {
        drop.y += drop.speed;

        // Draw tail
        for (let i = 1; i <= drop.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const opacity = Math.max(0.1, 1 - i / drop.length);
          ctx.globalAlpha = opacity;
          ctx.fillStyle = colors[drop.hue];
          ctx.shadowColor = colors[drop.hue];
          ctx.shadowBlur = 8;
          ctx.font = '18px monospace';
          ctx.fillText(char, drop.x, drop.y - i * 22);
        }

        // White glowing head
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 40;
        ctx.font = '26px monospace';
        ctx.fillText('█', drop.x, drop.y);
      });

      // Remove old drops
      dropsRef.current = dropsRef.current.filter(d => d.y < canvas.height + 600);

      requestAnimationFrame(draw);
    };

    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="App">
      {/* CANVAS RAIN — VISIBLE AND CINEMATIC */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
          background: 'transparent'
        }}
      />

      {/* SHIELDED */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}

      {/* Your UI — on top */}
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
