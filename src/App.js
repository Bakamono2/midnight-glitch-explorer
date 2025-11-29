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

          // Shielded stats
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

  // YOUR ORIGINAL, WORKING DIGITAL RAIN — UNTOUCHED
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

      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />

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

        {/* YOUR FINAL DASHBOARD — EXACTLY AS YOU WANTED */}
        <div style={{ width: 'min(720px, 90vw)', padding: '1.4rem 2rem', background: 'rgba(0,20,40,0.95)', border: '2px solid #0ff', borderRadius: '16px', boxShadow: '0 0 35px #0ff', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', fontSize: 'clamp(0.9rem, 1.6vw, 1.3rem)', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
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
          <span className="glitch">shhh...</span> nothing
