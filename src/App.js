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

  // THE ORIGINAL, PERFECT DIGITAL RAIN — 100% RESTORED AND WORKING
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const cols = Math.floor(w / 20) + 1;
    const ypos = Array(cols).fill(0);

    const matrix = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const draw = () => {
      // This fade is what made it work perfectly — NOT too dark
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#0ff';
      ctx.font = '15pt monospace';

      ypos.forEach((y, ind) => {
        const text = matrix[Math.floor(Math.random() * matrix.length)];
        const x = ind * 20;
        ctx.fillText(text, x, y);

        if (y > 100 + Math.random() * 10000) {
          ypos[ind] = 0;
        } else {
          ypos[ind] = y + 20;
        }
      });
    };

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch blocks + transaction burst (your original magic)
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

          // ORIGINAL BURST — visible and beautiful
          const canvas = canvasRef.current;
          if (canvas && !document.hidden) {
            const ctx = canvas.getContext('2d');
            const matrix = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            for (let i = 0; i < txs.length * 4; i++) {
              setTimeout(() => {
                ctx.fillStyle = '#0ff';
                ctx.font = 'bold 22px monospace';
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                ctx.fillText(matrix[Math.floor(Math.random() * matrix.length)], x, y);
              }, i * 20);
            }
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
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

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      {/* DIGITAL RAIN — 100% VISIBLE, NO BLACK SCREEN */}
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

      {/* MAIN CONTENT */}
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', color: '#0ff', fontFamily: '"Courier New", monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh', padding: '3vh 4vw' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="glitch-title" style={{ margin: '0 0 1vh', fontSize: 'clamp(2.8rem, 7vw, 7rem)' }}>MIDNIGHT</h1>
          <p style={{ margin: 0, fontSize: 'clamp(1.4rem, 3.5vw, 2.8rem)', opacity: 0.9 }}>EXPLORER</p>
        </div>

        <div style={{ width: 'min(680px, 88vw)', padding: '2.5rem', background: 'rgba(0,15,30,0.95)', border: '2px solid #0ff', borderRadius: '20px', boxShadow: '0 0 50px #0ff', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
          <h2 className="glitch" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', margin: '0 0 1rem' }}>LATEST BLOCK</h2>
          <p style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', margin: '0.5rem 0', color: '#f0f' }}>#{latest?.height || '...'}</p>
          <p style={{ margin: '1rem 0', fontSize: 'clamp(0.75rem, 1.6vw, 1.1rem)', wordBreak: 'break-all' }}>Hash: {(latest?.hash || '').slice(0, 32)}...</p>
          <p style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2.2rem)', color: '#0f0' }}>{recentBlocks[0]?.tx_count || 0} transactions</p>
        </div>

        <div style={{ width: 'min(680px, 88vw)', padding: '1rem 1.8rem', background: 'rgba(0,20,40,0.92)', border: '1px solid #0ff', borderRadius: '12px', boxShadow: '0 0 25px rgba(0,255,255,0.3)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', fontSize: 'clamp(0.85rem, 1.5vw, 1.2rem)', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
          <div><span style={{ opacity: 0.7 }}>Tx/s</span><br /><span style={{ color: '#0f0', fontWeight: 'bold' }}>0.0</span></div>
          <div><span style={{ opacity: 0.7 }}>TPS Peak</span><br /><span style={{ color: '#0f0' }}>0.0</span></div>
          <div><span style={{ opacity: 0.7 }}>Avg Block Time</span><br /><span style={{ color: '#0ff' }}>20s</span></div>
          <div><span style={{ opacity: 0.7 }}>Blocks This Epoch</span><br /><span style={{ color: '#0ff', fontWeight: 'bold' }}>{latest ? (latest.height - Math.floor(latest.height / 21600) * 21600 + 1) : '-'}</span></div>
          <div><span style={{ opacity: 0.7 }}>Epoch Ends In</span><br /><span style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</span></div>
          <div><span style={{ opacity: 0.7 }}>Network</span><br /><span style={{ color: '#0ff' }}>Preprod</span></div>
        </div>

        <footer style={{ marginTop: 'auto', paddingBottom: '3vh', opacity: 0.7, fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}>
          <span className="glitch">shhh...</span> nothing ever happened
        </footer>
      </div>

      {/* TIMELINE */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: isTimelineOpen ? '2vw' : '-288px',
        transform: 'translateY(-50%)',
        width: '320px',
        height: '76vh',
        maxHeight: '76vh',
        background: 'rgba(0,10,30,0.96)',
        borderRadius: '16px',
        border: '2px solid #0ff',
        boxShadow: '0 0 40px rgba(0,255,255,0.5)',
        transition: 'right 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        display: 'flex'
      }}>
        <button
          onClick={() => setIsTimelineOpen(p => !p)}
          style={{
            width: '32px',
            height: '100%',
            background: 'rgba(0, 255, 255, 0.38)',
            border: 'none',
            borderRight: '2px solid #0ff',
            borderRadius: '16px 0 0 16px',
            color: '#0ff',
            cursor: 'pointer',
            boxShadow: '-10px 0 35px rgba(0,255,255,0.9)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            {isTimelineOpen ? (
              <path d="M15 18l-6-6 6-6" />
            ) : (
              <path d="M9 18l6-6-6-6" />
            )}
          </svg>
        </button>

        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', scrollbarWidth: 'none' }}>
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          {recentBlocks.slice(0, 10).map((b, i) => (
            <div key={b.hash} style={{
              padding: '0.9rem 0',
              borderBottom: i < 9 ? '1px dashed rgba(0,255,255,0.2)' : 'none',
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
