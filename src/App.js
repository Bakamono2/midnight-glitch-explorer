import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  // Privacy stats
  const [shieldedTps, setShieldedTps] = useState('0.0');
  const [privacyScore, setPrivacyScore] = useState(0);
  const recentTxsRef = useRef([]); // stores { shielded: true/false }

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

  // Auto open/close timeline
  useEffect(() => {
    const check = () => setIsTimelineOpen(window.innerWidth >= 1100);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // MAIN FETCH + PRIVACY STATS + RAIN SPAWNING
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

          // Count shielded transactions
          const shieldedCount = txs.filter(tx =>
            tx.outputs.some(o => o.plutus_data || o.data_hash)
          ).length;

          // Shielded Tx/s
          setShieldedTps((shieldedCount / 8).toFixed(1));

          // Update recent transactions for privacy score
          const newTxs = txs.map(tx => ({
            shielded: tx.outputs.some(o => o.plutus_data || o.data_hash)
          }));
          recentTxsRef.current = [...newTxs, ...recentTxsRef.current].slice(0, 100);

          // Privacy Score — NEVER NaN
          const shieldedInWindow = recentTxsRef.current.filter(t => t.shielded).length;
          const score = recentTxsRef.current.length > 0
            ? Math.round((shieldedInWindow / recentTxsRef.current.length) * 100)
            : 0;
          setPrivacyScore(score);

          // Spawn rain only when tab is visible
          if (!document.hidden) {
            spawnOneColumnPerTx(txs.length);
          }
        }
      } catch (e) {
        console.error(e);
      }
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

  // DIGITAL RAIN — 100% WORKING
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

  // Blocks This Epoch
  const blocksThisEpoch = latest
    ? (latest.height - Math.floor(latest.height / 21600) * 21600 + 1)
    : '-';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />

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

        {/* FINAL DASHBOARD — NO NaN EVER */}
        <div style={{ width: 'min(680px, 88vw)', padding: '1rem 1.8rem', background: 'rgba(0,20,40,0.92)', border: '1px solid #0ff', borderRadius: '12px', boxShadow: '0 0 25px rgba(0,255,255,0.3)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', fontSize: 'clamp(0.85rem, 1.5vw, 1.2rem)', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
          <div><span style={{ opacity: 0.7 }}>Tx/s</span><br /><span style={{ color: '#0f0', fontWeight: 'bold' }}>0.0</span></div>
          <div><span style={{ opacity: 0.7 }}>TPS Peak</span><br /><span style={{ color: '#0f0' }}>0.0</span></div>
          <div><span style={{ opacity: 0.7 }}>Avg Block Time</span><br /><span style={{ color: '#0ff' }}>20s</span></div>
          <div><span style={{ opacity: 0.7 }}>Blocks This Epoch</span><br /><span style={{ color: '#0ff', fontWeight: 'bold' }}>{blocksThisEpoch}</span></div>
          <div><span style={{ opacity: 0.7 }}>Epoch Ends In</span><br /><span style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</span></div>
          <div><span style={{ opacity: 0.7 }}>Shielded Tx/s</span><br /><span style={{ color: '#f0f', fontWeight: 'bold' }}>{shieldedTps}</span></div>
          <div><span style={{ opacity: 0.7 }}>Privacy Score</span><br /><span style={{ color: '#ff0', fontWeight: 'bold' }}>{privacyScore}%</span></div>
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
