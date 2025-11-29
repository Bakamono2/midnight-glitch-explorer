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
  const recentTxsRef = useRef([]);

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

  // Responsive timeline
  useEffect(() => {
    const check = () => setIsTimelineOpen(window.innerWidth >= 1100);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch latest block + spawn rain
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

          // Privacy stats
          const shieldedCount = txs.filter(tx =>
            tx.outputs.some(o => o.plutus_data || o.data_hash)
          ).length;
          setShieldedTps((shieldedCount / 8).toFixed(1));

          recentTxsRef.current = [...txs.map(tx => ({
            shielded: tx.outputs.some(o => o.plutus_data || o.data_hash)
          })), ...recentTxsRef.current].slice(0, 100);

          const shieldedInWindow = recentTxsRef.current.filter(t => t.shielded).length;
          setPrivacyScore(recentTxsRef.current.length > 0
            ? Math.round((shieldedInWindow / recentTxsRef.current.length) * 100)
            : 0);

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

  // YOUR ORIGINAL, PERFECT DIGITAL RAIN — NEVER TOUCHED AGAIN
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

  const blocksThisEpoch = latest
    ? (latest.height - Math.floor(latest.height / 21600) * 21600 + 1)
    : '-';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

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
        {/* TITLE */}
        <div style={{ textAlign: 'center' }}>
          <h1 className="glitch-title" style={{ margin: '0 0 1vh', fontSize: 'clamp(3.5rem, 9vw, 9rem)' }}>
            MIDNIGHT
          </h1>
          <p style={{ margin: 0, fontSize: 'clamp(1.8rem, 4.5vw, 3.5rem)', opacity: 0.9 }}>
            EXPLORER
          </p>
        </div>

        {/* LATEST BLOCK CARD */}
        <div style={{
          width: 'min(780px, 92vw)',
          padding: '3.2rem',
          background: 'rgba(0,15,30,0.96)',
          border: '2px solid #0ff',
          borderRadius: '24px',
          boxShadow: '0 0 60px #0ff',
          textAlign: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <h2 className="glitch" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', margin: '0 0 1.2rem' }}>
            LATEST BLOCK
          </h2>
          <p style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', margin: '0.6rem 0', color: '#f0f' }}>
            #{latest?.height || '...'}
          </p>
          <p style={{ margin: '1.2rem 0', fontSize: 'clamp(0.9rem, 2vw, 1.4rem)', wordBreak: 'break-all', opacity: 0.8 }}>
            Hash: {(latest?.hash || '').slice(0, 40)}...
          </p>
          <p style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', color: '#0f0' }}>
            {recentBlocks[0]?.tx_count || 0} transactions
          </p>
        </div>

        {/* NEW DASHBOARD — BUILT FROM SCRATCH */}
        <div style={{
          width: 'min(900px, 94vw)',
          padding: '2rem 2.5rem',
          background: 'rgba(0,20,50,0.92)',
          border: '2px solid #0ff',
          borderRadius: '20px',
          boxShadow: '0 0 50px rgba(0,255,255,0.6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1.4rem',
          fontSize: 'clamp(1rem, 2vw, 1.5rem)',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>Tx/s</div>
            <div style={{ color: '#0f0', fontWeight: 'bold' }}>0.0</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>TPS Peak</div>
            <div style={{ color: '#0f0' }}>0.0</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>Avg Block Time</div>
            <div style={{ color: '#0ff' }}>20s</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>Blocks This Epoch</div>
            <div style={{ color: '#0ff', fontWeight: 'bold' }}>{blocksThisEpoch}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>Epoch Ends In</div>
            <div style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>Shielded Tx/s</div>
            <div style={{ color: '#f0f', fontWeight: 'bold' }}>{shieldedTps}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>Privacy Score</div>
            <div style={{ color: '#ff0', fontWeight: 'bold' }}>{privacyScore}%</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.9em' }}>Network</div>
            <div style={{ color: '#0ff' }}>Preprod</div>
          </div>
        </div>

        <footer style={{ marginTop: 'auto', paddingBottom: '4vh', opacity: 0.7, fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)' }}>
          <span className="glitch">shhh...</span> nothing ever happened
        </footer>
      </div>

      {/* TIMELINE */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: isTimelineOpen ? '2vw' : '-300px',
        transform: 'translateY(-50%)',
        width: '340px',
        height: '78vh',
        background: 'rgba(0,10,30,0.97)',
        borderRadius: '20px',
        border: '2px solid #0ff',
        boxShadow: '0 0 50px rgba(0,255,255,0.7)',
        transition: 'right 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        display: 'flex'
      }}>
        <button
          onClick={() => setIsTimelineOpen(p => !p)}
          style={{
            width: '36px',
            background: 'rgba(0,255,255,0.4)',
            border: 'none',
            borderRight: '2px solid #0ff',
            borderRadius: '20px 0 0 20px',
            color: '#0ff',
            cursor: 'pointer',
            boxShadow: '-12px 0 40px rgba(0,255,255,1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5">
            {isTimelineOpen ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
          </svg>
        </button>
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <style jsx>{`::-webkit-scrollbar { display: none; }</style>
          {recentBlocks.slice(0, 12).map((b, i) => (
            <div key={b.hash} style={{
              padding: '1rem 0',
              borderBottom: i < 11 ? '1px dashed rgba(0,255,255,0.25)' : 'none',
              color: i === 0 ? '#0f0' : '#0ff',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.15rem'
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
