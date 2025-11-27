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

  // THIS IS THE ORIGINAL DIGITAL RAIN — EXACTLY AS IT WAS
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Fixed size — just like the very first version
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    const matrix = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f51';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = matrix[Math.floor(Math.random() * matrix.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        drops[i]++;
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
      }
    };

    const interval = setInterval(draw, 35);

    return () => clearInterval(interval);
  }, []);

  // Block fetching + original burst effect
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

          // ORIGINAL TRANSACTION BURST — pure magic
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const matrix = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

          for (let i = 0; i < txs.length * 4; i++) {
            setTimeout(() => {
              ctx.fillStyle = '#0ff';
              ctx.font = 'bold 20px monospace';
              const x = Math.random() * canvas.width;
              const y = Math.random() * canvas.height;
              ctx.fillText(matrix[Math.floor(Math.random() * matrix.length)], x, y);
            }, i * 20);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  // Timeline auto-hide on mobile
  useEffect(() => {
    const handleResize = () => setIsTimelineOpen(window.innerWidth >= 1100);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        color: '#0ff',
        fontFamily: '"Courier New", monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4vh',
        padding: '4vh 5vw'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="glitch-title" style={{ margin: '0 0 1vh', fontSize: 'clamp(3rem, 8vw, 8rem)' }}>
            MIDNIGHT
          </h1>
          <p style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 3rem)', opacity: 0.9 }}>
            EXPLORER
          </p>
        </div>

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
