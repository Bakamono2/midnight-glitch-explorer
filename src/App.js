import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [txRate, setTxRate] = useState(null);
  const [timeSinceBlock, setTimeSinceBlock] = useState(null);
  const [epochBlocks, setEpochBlocks] = useState(null);
  const [epochTxCount, setEpochTxCount] = useState(null);
  const [epochNumber, setEpochNumber] = useState(null);
  const [isTestRainActive, setIsTestRainActive] = useState(false);

  const canvasRef = useRef(null);
  const columnsRef = useRef([]);
  const epochEndRef = useRef(null);
  const animationRef = useRef(null);
  const testSpawnRef = useRef(null);

  const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?;:*/';
  const [overlayMode, setOverlayMode] = useState('dark');

  const getScale = () => {
    const area = window.innerWidth * window.innerHeight;
    const referenceArea = 1920 * 1080;
    return Math.sqrt(area / referenceArea);
  };

  const spawnOneColumnPerTx = (txCount) => {
    const scale = getScale();
    const safeMargin = 160 * scale;

    // Bias drop lengths toward the upper range so most streams feel longer while
    // still respecting the 24–64 character constraint.
    const randomLength = () => {
      const skewed = Math.pow(Math.random(), 0.45); // favor higher values
      return Math.max(24, Math.min(64, Math.round(24 + skewed * (64 - 24))));
    };

    for (let i = 0; i < txCount; i++) {
      columnsRef.current.push({
        x: safeMargin + Math.random() * (window.innerWidth - 2 * safeMargin),
        y: -200 - Math.random() * 600,
        speed: (0.85 + Math.random() * 1.4) * scale,
        // Enforce drop length between 24 and 64 glyphs (trail + head) with a skew toward longer trails.
        length: randomLength(),
        headPos: Math.random() * 8,
        hue: i % 4,
        fadeRate: 0.045 + Math.random() * 0.05,
        trailJitter: Math.random() * 0.4,
        // Random highlight flag (visual-only) to let some heads pop with a white glow.
        highlighted: Math.random() < 0.14,
        // trail state used only for rendering (spawn logic untouched)
        glyphs: [],
        distanceSinceChar: 0
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
          if (latest?.time && block.time) {
            const seconds = Math.max(1, block.time - latest.time);
            const txCount = block.tx_count ?? txs.length;
            setTxRate(txCount / seconds);
          } else {
            setTxRate(block.tx_count ?? txs.length ?? null);
          }
          setLatest(block);
          setRecentBlocks(prev => [block, ...prev].slice(0, 50));
          spawnOneColumnPerTx(txs.length);
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
    const fetchEpoch = async () => {
      try {
        const r = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY } });
        const e = await r.json();
        epochEndRef.current = e.end_time * 1000;
        setEpochBlocks(e.block_count ?? e.blocks ?? null);
        setEpochTxCount(e.tx_count ?? e.transactions_count ?? null);
        setEpochNumber(e.epoch ?? null);
      } catch {}
    };
    fetchEpoch();
    const refreshEpoch = setInterval(fetchEpoch, 60000);
    const timer = setInterval(() => {
      if (!epochEndRef.current) return;
      const diff = epochEndRef.current - Date.now();
      if (diff <= 0) return setTimeLeft('EPOCH ENDED');
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);
    return () => {
      clearInterval(timer);
      clearInterval(refreshEpoch);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (latest?.time) {
        setTimeSinceBlock(Math.max(0, Math.floor(Date.now() / 1000 - latest.time)));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [latest]);

  // Optional debug toggle: continuously spawn drops without hitting the API to stress test rendering.
  useEffect(() => {
    if (isTestRainActive) {
      if (testSpawnRef.current) clearInterval(testSpawnRef.current);
      testSpawnRef.current = setInterval(() => {
        // Spawn a small burst frequently to simulate sustained load.
        const burstSize = 4 + Math.floor(Math.random() * 4);
        spawnOneColumnPerTx(burstSize);
      }, 350);
    } else if (testSpawnRef.current) {
      clearInterval(testSpawnRef.current);
      testSpawnRef.current = null;
    }

    return () => {
      if (testSpawnRef.current) {
        clearInterval(testSpawnRef.current);
        testSpawnRef.current = null;
      }
    };
  }, [isTestRainActive]);

  const averageTxPerBlock = useMemo(() => {
    if (!recentBlocks.length) return null;
    const slice = recentBlocks.slice(0, 10);
    const total = slice.reduce((sum, b) => sum + (b.tx_count || 0), 0);
    return (total / slice.length).toFixed(1);
  }, [recentBlocks]);

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

    // Green → cyan palette only (no magenta/other hues) for tails/head shading.
    const colors = ['#00f6ff', '#00ffb3', '#00d6ff', '#00ff7a'];
    const overlayAlpha = 0.18;

    const nextGlyph = () => chars[Math.floor(Math.random() * chars.length)];

    // Matrix-style rain render loop with composite fade for smooth trails.
    const draw = () => {
      const scale = getScale();
      const baseFontSize = 24 * scale;
      const charSpacing = 26 * scale;
      const headGlow = 3 * scale;

      // Fade previous frame using destination-out so trails gently decay without tint buildup.
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = overlayMode === 'transparent' ? 'rgba(0, 0, 0, 0.08)' : `rgba(0, 0, 0, ${overlayAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      ctx.font = `${baseFontSize}px "Matrix Code NFI", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      columnsRef.current.forEach((col) => {
        col.y += col.speed;
        col.headPos += 0.35 + col.trailJitter * 0.25;
        col.distanceSinceChar += col.speed;

        // Record characters at roughly fixed spacing so tails are stable and readable.
        while (col.distanceSinceChar >= charSpacing) {
          col.glyphs.unshift(nextGlyph());
          col.glyphs = col.glyphs.slice(0, col.length);
          col.distanceSinceChar -= charSpacing;
        }

        if (!col.glyphs.length) {
          col.glyphs.unshift(nextGlyph());
        }

        const columnLength = Math.min(col.length, col.glyphs.length || col.length);

        for (let i = 0; i < columnLength; i++) {
          const glyph = col.glyphs[i] || nextGlyph();
          const distanceFromHead = i;
          const trailAlpha = Math.max(0, 1 - distanceFromHead / columnLength);
          const depthFade = Math.max(0, 1 - distanceFromHead * col.fadeRate);
          const opacity = Math.max(0, Math.min(trailAlpha * depthFade, 1));

          if (opacity <= 0.05) continue;

          // Reset per-glyph shadow/blur so tails stay sharp with no glow bleed.
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.globalAlpha = opacity;

          const isHead = distanceFromHead === 0;
          if (isHead) {
            // Head glyph: cyan/green by default, occasional white highlight with stronger glow.
            if (col.highlighted) {
              // Brighter highlight head: pure white fill with a stronger, cool glow.
              ctx.fillStyle = 'rgba(255, 255, 255, 1)';
              ctx.shadowColor = 'rgba(215, 255, 255, 0.95)';
              ctx.shadowBlur = headGlow * 2.2;
            } else {
              ctx.fillStyle = 'rgba(0, 225, 210, 0.85)';
              ctx.shadowColor = 'rgba(0, 225, 210, 0.4)';
              ctx.shadowBlur = headGlow;
            }
          } else {
            // Tail glyphs: green→cyan hue with fading opacity, no glow.
            ctx.fillStyle = colors[col.hue];
          }

          ctx.fillText(glyph, col.x, col.y - i * charSpacing);

          // Immediately clear shadow so it does not leak into the next glyph.
          if (isHead) {
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
          }
        }

        // Reset per-column state to avoid shadow/alpha carry-over between columns.
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      });

      // Remove drops that have fully exited the viewport or fully faded to keep performance steady.
      const spacing = 26 * getScale();
      columnsRef.current = columnsRef.current.filter(
        (c) => c.y - Math.min(64, c.length) * spacing < canvas.height + 120
      );

      // Reset global state at the end of the frame to avoid carry-over.
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [overlayMode]);

  useEffect(() => {
    const toggleOverlay = (e) => {
      if (e.key.toLowerCase() === 'o') {
        setOverlayMode((mode) => (mode === 'dark' ? 'transparent' : 'dark'));
      }
    };

    window.addEventListener('keydown', toggleOverlay);
    return () => window.removeEventListener('keydown', toggleOverlay);
  }, []);

  const blockSizeKb = useMemo(() => (latest?.size ? (latest.size / 1024).toFixed(1) : null), [latest]);

  const stats = [
    { label: 'Tx/s', value: txRate != null ? txRate.toFixed(2) : '...' },
    { label: 'Blocks This Epoch', value: epochBlocks ?? '-' },
    { label: 'Epoch Ends In', value: timeLeft },
    { label: 'Avg Tx/Block (10)', value: averageTxPerBlock || '-' },
    { label: 'Block Size', value: blockSizeKb ? `${blockSizeKb} KB` : '-' },
    { label: 'Since Last Block', value: timeSinceBlock != null ? `${timeSinceBlock}s` : '...' },
    { label: 'Epoch Tx Count', value: epochTxCount ?? '-' },
    { label: 'Epoch', value: epochNumber ?? '-' }
  ];

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
          pointerEvents: 'none',
          backgroundColor: 'transparent'
        }}
      />

      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', color: '#0ff', fontFamily: '"Courier New", monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh', padding: '3vh 5vw' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="glitch-title" style={{ margin: '0 0 0.5vh', fontSize: 'clamp(2.8rem, 7vw, 6.5rem)' }}>MIDNIGHT</h1>
          <p style={{ margin: 0, fontSize: 'clamp(1.2rem, 3.5vw, 2.4rem)', opacity: 0.9, letterSpacing: '0.25em' }}>EXPLORER</p>
        </div>

        <div style={{ width: 'min(720px, 92vw)', padding: '2.4rem', background: 'rgba(0,15,30,0.95)', border: '2px solid #0ff', borderRadius: '20px', boxShadow: '0 0 50px #0ff', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
          <h2 className="glitch" style={{ fontSize: 'clamp(1.5rem, 3.6vw, 2.4rem)', margin: '0 0 0.6rem' }}>LATEST BLOCK</h2>
          <p style={{ fontSize: 'clamp(2.1rem, 6vw, 4rem)', margin: '0.3rem 0', color: '#f0f' }}>#{latest?.height || '...'}</p>
          <p style={{ margin: '0.8rem 0', fontSize: 'clamp(0.85rem, 2vw, 1.15rem)', wordBreak: 'break-all', opacity: 0.9 }}>Hash: {(latest?.hash || '').slice(0, 32)}...</p>
          <p style={{ fontSize: 'clamp(1.2rem, 3.2vw, 2rem)', color: '#0f0', marginTop: '0.8rem' }}>{recentBlocks[0]?.tx_count || 0} transactions</p>
        </div>

        <div style={{ width: 'min(720px, 92vw)', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setIsTestRainActive((prev) => !prev)}
            style={{
              padding: '0.85rem 1.4rem',
              background: isTestRainActive ? 'rgba(0,255,180,0.18)' : 'rgba(0,255,255,0.12)',
              color: '#0ff',
              border: '1px solid rgba(0,255,255,0.45)',
              borderRadius: '12px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              boxShadow: '0 0 18px rgba(0,255,255,0.35)',
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
              transition: 'background 0.25s ease, transform 0.2s ease',
              transform: isTestRainActive ? 'translateY(-1px)' : 'translateY(0)'
            }}
          >
            {isTestRainActive ? 'Stop Rain Stress Test' : 'Start Rain Stress Test'}
          </button>
        </div>

        <div style={{ width: 'min(720px, 92vw)', padding: '1.15rem 1.25rem', background: 'rgba(0,20,40,0.95)', border: '2px solid #0ff', borderRadius: '16px', boxShadow: '0 0 30px #0ff', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', fontSize: 'clamp(0.8rem, 1.6vw, 1.05rem)', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
          {stats.map(stat => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.6rem', background: 'rgba(0,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,255,255,0.2)' }}>
              <span style={{ opacity: 0.85, fontSize: 'clamp(0.72em, 2vw, 0.95em)', letterSpacing: '0.04em' }}>{stat.label}</span>
              <span style={{ color: '#0f0', fontWeight: 'bold', fontSize: 'clamp(0.95em, 2.4vw, 1.25em)' }}>{stat.value}</span>
            </div>
          ))}
        </div>

        <footer style={{ marginTop: 'auto', paddingBottom: '3vh', opacity: 0.7, fontSize: 'clamp(0.95rem, 2vw, 1.3rem)' }}>
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
