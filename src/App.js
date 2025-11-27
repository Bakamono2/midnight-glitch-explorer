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

  // Auto-collapse timeline on narrow screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100) setIsTimelineOpen(false);
      else setIsTimelineOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch block + spawn rain per transaction
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

          // EXACT ORIGINAL RAIN SPAWN LOGIC
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          const w = canvas.width = window.innerWidth;
          const h = canvas.height = window.innerHeight;

          for (let i = 0; i < txs.length; i++) {
            const x = Math.random() * w;
            const y = -100 - Math.random() * 400;
            const speed = 3 + Math.random() * 6;
            const length = 8 + Math.floor(Math.random() * 12);

            // Create a new rain drop
            const drop = { x, y, speed, length, chars: [] };
            for (let j = 0; j < length; j++) {
              drop.chars.push({
                char: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 92)],
                opacity: j === 0 ? 1 : 0.1 + Math.random() * 0.9
              });
            }
            drops.push(drop);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  // Epoch countdown
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

  // YOUR ORIGINAL, PERFECT DIGITAL RAIN — EXACTLY AS IT WAS
  const drops = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId;
    const render = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drops.current = drops.current.filter(drop => drop.y < canvas.height + 300);

      drops.current.forEach(drop => {
        drop.y += drop.speed;

        drop.chars.forEach((ch, i) => {
          ctx.globalAlpha = ch.opacity;
          ctx.fillStyle = i === 0 ? '#0ff' : '#0aa';
          ctx.font = '18px monospace';
          ctx.fillText(ch.char, drop.x, drop.y - i * 22);
        });
      });

      animationId = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      {/* YOUR ORIGINAL DIGITAL RAIN — restored exactly */}
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
        }}
      />

      {/* MAIN CONTENT */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        background: 'transparent',
        color: '#0ff',
        fontFamily: '"Courier New", monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4vh',
        padding: '4vh 5vw'
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 className="glitch-title" style={{ margin: '0 0 1vh', fontSize: 'clamp(3rem, 8vw, 8rem)' }}>
            MIDNIGHT
          </h1>
          <p style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 3rem)', opacity: 0.9 }}>
            EXPLORER
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          width: 'min(720px, 90vw)',
          padding: '3rem',
          background: 'rgba(0,15,30,0.95)',
          border: '2px solid #0ff',
          borderRadius: '20px',
          boxShadow: '0 0 50px #0ff',
          textAlign: 'center',
          backdropFilter: 'blur(6px)'
        }}>
          <h2 className="glitch" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', margin: '0 0 1rem' }}>
            LATEST BLOCK
          </h2>
          <p style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', margin: '0.5rem 0', color: '#f0f' }}>
            #{latest?.height || '...'}
          </p>
          <p style={{ margin: '1rem 0', fontSize: 'clamp(0.8rem, 1.8vw, 1.2rem)', wordBreak: 'break-all' }}>
            Hash: {(latest?.hash || '').slice(0, 32)}...
          </p>
          <p style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: '#0f0' }}>
            {recentBlocks[0]?.tx_count || 0} transactions
          </p>
        </div>

        {/* Dashboard */}
        <div style={{
          width: 'min(720px, 90vw)',
          padding: '1.4rem 2rem',
          background: 'rgba(0,20,40,0.95)',
          border: '2px solid #0ff',
          borderRadius: '16px',
          boxShadow: '0 0 35px #0ff',
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: 'clamp(1.1rem, 2.2vw, 1.8rem)',
          textAlign: 'center',
          backdropFilter: 'blur(6px)'
        }}>
          <div>Tx/s <span style={{ color: '#0f0', fontWeight: 'bold' }}>0.0</span></div>
          <div>Total Blocks <span style={{ color: '#0f0', fontWeight: 'bold' }}>{latest?.height || '-'}</span></div>
          <div>Epoch Ends In <span style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</span></div>
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: 'auto',
          paddingBottom: '3vh',
          opacity: 0.7,
          fontSize: 'clamp(1rem, 2vw, 1.4rem)'
        }}>
          <span className="glitch">shhh...</span> nothing ever happened
        </footer>
      </div>

      {/* Timeline */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: isTimelineOpen ? '2vw' : '-360px',
        transform: 'translateY(-50%)',
        width: '340px',
        maxHeight: '76vh',
        background: 'rgba(0,10,30,0.96)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '2px solid #0ff',
        boxShadow: '0 0 40px rgba(0,255,255,0.4)',
        transition: 'right 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
        overflow: 'hidden',
        zIndex: 100,
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          height: '100%',
          overflowY: 'auto',
          paddingRight: '12px',
          marginRight: '-12px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          {recentBlocks.slice(0, 10).map((b, i) => (
            <div key={b.hash} style={{
              padding: '0.9rem 0',
              borderBottom: i < 9 ? '1px dashed #033' : 'none',
              color: i === 0 ? '#0f0' : '#0ff',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.1rem'
            }}>
              <span style={{ fontWeight: i === 0 ? 'bold' : 'normal' }}>#{b.height}</span>
              <span>{b.tx_count || 0} tx</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
        style={{
          position: 'fixed',
          top: '50%',
          right: isTimelineOpen ? 'calc(2vw + 340px + 12px)' : '12px',
          transform: 'translateY(-50%)',
          width: '28px',
          height: '60px',
          background: 'rgba(0, 255, 255, 0.2)',
          border: '2px solid #0ff',
          borderRadius: '14px 0 0 14px',
          color: '#0ff',
          fontSize: '1.4rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '-6px 0 20px rgba(0,255,255,0.6)',
          transition: 'all 0.4s ease',
          zIndex: 101,
          outline: 'none',
          backdropFilter: 'blur(8px)'
        }}
      >
        {isTimelineOpen ? '←' : '→'}
      </button>
    </>
  );
}

export default App;
