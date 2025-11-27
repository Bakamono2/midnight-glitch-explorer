import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  const canvasRef = useRef(null);
  const columnsRef = useRef([]);

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const getScale = () => {
    const area = window.innerWidth * window.innerHeight;
    const referenceArea = 1920 * 1080;
    return Math.sqrt(area / referenceArea);
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
    columnsRef.current = columnsRef.current.slice(-Math.floor(1200 * scale));
  };

  useEffect(() => {
    const check = () => setIsTimelineOpen(window.innerWidth >= 1100);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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
          spawnOneColumnPerTx(txs.length);
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
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
      if (!epochEnd) return;
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

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      />

      {/* MAIN CONTENT */}
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', color: '#0ff', fontFamily: '"Courier New", monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4vh', padding: '4vh 5vw' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="glitch-title" style={{ margin: '0 0 1vh', fontSize: 'clamp(3rem, 8vw, 8rem)' }}>MIDNIGHT</h1>
          <p style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 3rem)', opacity: 0.9 }}>EXPLORER</p>
        </div>

        <div style={{ width: 'min(720px, 90vw)', padding: '3rem', background: 'rgba(0,15,30,0.95)', border: '2px solid #0ff', borderRadius: '20px', boxShadow: '0 0 50px #0ff', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
          <h2 className="glitch" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', margin: '0 0 1rem' }}>LATEST BLOCK</h2>
          <p style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', margin: '0.5rem 0', color: '#f0f' }}>#{latest?.height || '...'}</p>
          <p style={{ margin: '1rem 0', fontSize: 'clamp(0.8rem, 1.8vw, 1.2rem)', wordBreak: 'break-all' }}>Hash: {(latest?.hash || '').slice(0, 32)}...</p>
          <p style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: '#0f0' }}>{recentBlocks[0]?.tx_count || 0} transactions</p>
        </div>

        <div style={{ width: 'min(720px, 90vw)', padding: '1.4rem 2rem', background: 'rgba(0,20,40,0.95)', border: '2px solid #0ff', borderRadius: '16px', boxShadow: '0 0 35px #0ff', display: 'flex', justifyContent: 'space-around', fontSize: 'clamp(1.1rem, 2.2vw, 1.8rem)', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
          <div>Tx/s <span style={{ color: '#0f0', fontWeight: 'bold' }}>0.0</span></div>
          <div>Total Blocks <span style={{ color: '#0f0', fontWeight: 'bold' }}>{latest?.height || '-'}</span></div>
          <div>Epoch Ends In <span style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</span></div>
        </div>

        <footer style={{ marginTop: 'auto', paddingBottom: '3vh', opacity: 0.7, fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}>
          <span className="glitch">shhh...</span> nothing ever happened
        </footer>
      </div>

      {/* PERFECT TIMELINE — ONLY BUTTON VISIBLE WHEN COLLAPSED */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: isTimelineOpen ? '2vw' : '-calc(100% - 32px)',  // hides everything except 32px button
        transform: 'translateY(-50%)',
        width: 'clamp(300px, 22vw, 340px)',
        height: '76vh',
        maxHeight: '76vh',
        background: 'rgba(0,10,30,0.96)',
        borderRadius: '16px',
        border: '2px solid #0ff',
        boxShadow: '0 0 40px rgba(0,255,255,0.5)',
        transition: 'right 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        display: 'flex'
      }}>
        {/* REAL ARROW ICON ONLY */}
        <button
          onClick={() => setIsTimelineOpen(p => !p)}
          style={{
            width: '32px',
            height: '100%',
            background: 'rgba(0, 255, 255, 0.4)',
            border: 'none',
            borderRight: '2px solid #0ff',
            borderRadius: '16px 0 0 16px',
            color: '#0ff',
            fontSize: '1.9rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '-14px 0 50px rgba(0,255,255,1)',
            transition: 'all 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            outline: 'none',
            backdropFilter: 'blur(12px)',
            flexShrink: 0
          }}
          aria-label={isTimelineOpen ? 'Close timeline' : 'Open timeline'}
        >
          {isTimelineOpen ? 'Right Arrow' : 'Left Arrow'}
        </button>

        <div style={{
          flex: 1,
          padding: '1.4rem 1.2rem',
          overflowY: 'auto',
          scrollbarWidth: 'none'
        }}>
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          {recentBlocks.slice(0, 10).map((b, i) => (
            <div key={b.hash} style={{
              padding: '0.85rem 0',
              borderBottom: i < 9 ? '1px dashed #033' : 'none',
              color: i === 0 ? '#0f0' : '#0ff',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.05rem'
            }}>
              <span style={{ fontWeight: i === 0 ? 'bold' : 'normal' }}>#{b.height}</span>
              <span>{b.tx_count || 0} tx</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
