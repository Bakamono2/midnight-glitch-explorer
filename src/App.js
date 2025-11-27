import React, { useState, useEffect, useRef } from 'react';
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

  const getScale = () => {
    const area = window.innerWidth * window.innerHeight;
    const ref = 1920 * 1080;
    return Math.sqrt(area / ref);
  };

  const spawnOneColumnPerTx = (txCount) => {
    const scale = getScale();
    const margin = 160 * scale;
    for (let i = 0; i < txCount; i++) {
      columnsRef.current.push({
        x: margin + Math.random() * (window.innerWidth - 2 * margin),
        y: -200 - Math.random() * 600,
        speed: (0.7 + Math.random() * 1.1) * scale,
        length: 20 + Math.floor(Math.random() * 35),
        headPos: Math.random() * 8,
        hue: i % 3
      });
    }
    columnsRef.current = columnsRef.current.slice(-Math.floor(1200 * scale));
  };

  // ← (all useEffect blocks unchanged — they are perfect)

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
          spawnOneColumnPerTx(txCount);
          if (txCount > 0) setShieldedFloats(prev => [...prev, { id: Date.now(), left: 10 + Math.random() * 80 }].slice(-12));
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest]);

  useEffect(() => { /* epoch timer — unchanged */ }, []);
  useEffect(() => { /* canvas rain — unchanged */ }, []);
  useEffect(() => { /* viewport meta */ }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      {/* Digital Rain */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      {/* Title — absolute */}
      <h1 className="glitch-title" data-text="MIDNIGHT"
        style={{ position: 'fixed', top: '5vh', left: '50%', transform: 'translateX(-50%)', zIndex: 20, margin: 0 }}>
        MIDNIGHT
      </h1>
      <p className="subtitle" data-text="EXPLORER"
        style={{ position: 'fixed', top: '18vh', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
        EXPLORER
      </p>

      {/* Main Card — absolute centered */}
      <div className="main-card"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(720px, 90vw)',
          zIndex: 20
        }}>
        <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
        <p className="block-num">#{latest?.height || '...'}</p>
        <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
        <p className="txs">{recentBlocks[0]?.tx_count || 0} transactions</p>
      </div>

      {/* Epoch Clock — absolute bottom-center pill */}
      <div style={{
        position: 'fixed',
        bottom: '14vh',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        padding: '0.8rem 2.5rem',
        borderRadius: '50px',
        border: '2px solid #f0f',
        boxShadow: '0 0 30px #f0f',
        fontSize: 'clamp(1.4rem, 3vw, 2.4rem)',
        whiteSpace: 'nowrap',
        zIndex: 20
      }}>
        EPOCH ENDS IN <span className="timer">{timeLeft}</span>
      </div>

      {/* Footer — absolute very bottom */}
      <footer style={{
        position: 'fixed',
        bottom: '3vh',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        opacity: 0.7
      }}>
        <p style={{ margin: 0 }}><span className="glitch" data-text="shhh...">shhh...</span> nothing ever happened</p>
      </footer>

      {/* Timeline — absolute top-right */}
      <div style={{
        position: 'fixed',
        top: '12vh',
        right: '3vw',
        width: '340px',
        maxHeight: '75vh',
        overflowY: 'auto',
        background: 'rgba(0,10,30,0.6)',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid #0ff',
        boxShadow: '0 0 25px rgba(0,255,255,0.3)',
        zIndex: 20
      }}>
        <div className="timeline">
          {recentBlocks.slice(0, 30).map((b, i) => (
            <div key={b.hash} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>
              <span className="height">#{b.height}</span>
              <span className="txs">{b.tx_count || 0} tx</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shielded Text */}
      {shieldedFloats.map(f => (
        <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>
          SHIELDED
        </div>
      ))}
    </>
  );
}

export default App;
