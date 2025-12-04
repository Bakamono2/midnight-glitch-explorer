import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import { fetchLatestBlockAndTxs, isBlockfrostAllowed } from './providers';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [txRate, setTxRate] = useState(null);
  const [timeSinceBlock, setTimeSinceBlock] = useState(null);
  const [isTestRainActive, setIsTestRainActive] = useState(false);
  const [activeDropCount, setActiveDropCount] = useState(0);
  const [isGlitchActive, setIsGlitchActive] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerErrors, setProviderErrors] = useState({ block: null });

  const canvasRef = useRef(null);
  const columnsRef = useRef([]);
  const animationRef = useRef(null);
  const testSpawnRef = useRef(null);
  const perfRef = useRef({
    lastFrameTime: performance.now(),
    frameDeltas: []
  });

  const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?;:*/';
  const [overlayMode, setOverlayMode] = useState('dark');

  const ALLOW_BLOCKFROST_FALLBACK = isBlockfrostAllowed();

  const parseSeconds = (timestamp) => {
    if (!timestamp) return null;
    const value = Date.parse(timestamp);
    return Number.isNaN(value) ? null : Math.floor(value / 1000);
  };

  const getScale = () => {
    const area = window.innerWidth * window.innerHeight;
    const referenceArea = 1920 * 1080;
    return Math.sqrt(area / referenceArea);
  };

  const spawnOneColumnPerTx = (txSource) => {
    const scale = getScale();
    const safeMargin = 160 * scale;

    // Normalize the input so we can handle a simple count (existing behavior) or
    // a list of transaction metadata to drive semantic styling in future phases.
    const txs = Array.isArray(txSource)
      ? txSource
      : Array.from({ length: txSource || 0 }, () => null);

    const deriveMeta = (tx) => {
      const hash = tx && typeof tx.hash === 'string' ? tx.hash : undefined;

      let sizeBytes = 0;
      if (tx && typeof tx.sizeBytes === 'number') {
        sizeBytes = tx.sizeBytes;
      } else if (tx && typeof tx.size === 'number') {
        sizeBytes = tx.size;
      } else if (tx && typeof tx.raw === 'string') {
        const hex = tx.raw.startsWith('0x') ? tx.raw.slice(2) : tx.raw;
        sizeBytes = Math.floor(hex.length / 2);
      } else {
        // Fallback: bounded random size so visuals stay varied when metadata is missing.
        sizeBytes = 200 + Math.random() * 4000;
      }

      let type = 'unknown';
      if (tx && typeof tx.type === 'string') {
        type = tx.type;
      } else if (tx && typeof tx.kind === 'string') {
        type = tx.kind;
      } else if (tx && typeof tx.module === 'string') {
        type = tx.module.toLowerCase().includes('contract') ? 'contract' : 'transfer';
      }

      // Importance scaled on a log curve so large txs have more influence without dominating.
      const importance = Math.min(1, Math.log10(1 + sizeBytes) / 4);

      return {
        hash,
        sizeBytes,
        type,
        importance
      };
    };

    const computeTailLength = (sizeBytes) => {
      const minLen = 24;
      const maxLen = 64;
      const norm = Math.min(1, Math.log10(1 + sizeBytes) / 4);
      const skewed = Math.pow(norm, 0.5);
      let length = minLen + skewed * (maxLen - minLen);

      if (Math.random() < 0.35) {
        length = 56 + Math.random() * 8;
      }

      return Math.round(Math.max(minLen, Math.min(maxLen, length)));
    };

    txs.forEach((tx, i) => {
      const meta = deriveMeta(tx);
      const imp = typeof meta.importance === 'number' ? Math.max(0, Math.min(1, meta.importance)) : 0;
      const metaWithImportance = { ...meta, importance: imp };
      const baseSpeed = 0.9 + Math.random() * 0.9;
      const importanceBoost = imp * 0.9;
      const speed = (baseSpeed + importanceBoost) * scale;

      const baseHighlightChance = 0.18;
      const extraHighlightChance = imp * 0.42;
      const highlightChance = Math.max(0, Math.min(1, baseHighlightChance + extraHighlightChance));
      const highlighted = Math.random() < highlightChance;
      const headHighlightCount = highlighted ? 1 + Math.floor(Math.random() * 3) : 1;
      const rotation = (0.04 + Math.random() * 0.08) * (Math.random() < 0.5 ? -1 : 1);

      columnsRef.current.push({
        x: safeMargin + Math.random() * (window.innerWidth - 2 * safeMargin),
        y: -200 - Math.random() * 600,
        speed,
        // Enforce drop length between 24 and 64 glyphs (trail + head) with a skew toward longer trails,
        // now lightly influenced by tx size when available.
        length: computeTailLength(meta.sizeBytes),
        headPos: Math.random() * 8,
        hue: i % 4,
        fadeRate: 0.045 + Math.random() * 0.05,
        trailJitter: Math.random() * 0.4,
        // Random highlight flag (visual-only) to let some heads pop with a white glow.
        highlighted,
        headHighlightCount,
        rotation,
        // Attach semantic metadata for future styling/interaction without changing spawn logic.
        meta: metaWithImportance,
        // trail state used only for rendering (spawn logic untouched)
        glyphs: [],
        distanceSinceChar: 0
      });
    });
    // Keep a generous cap based on viewport scale so spawning remains one-per-tx but
    // older columns are culled before they overwhelm the renderer on small screens.
    const baseCap = 900 * scale;
    if (columnsRef.current.length > baseCap) {
      columnsRef.current = columnsRef.current.slice(-Math.floor(baseCap));
    }
  };

  useEffect(() => {
    const check = () => setIsTimelineOpen(window.innerWidth >= 1100);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Trigger a short glitch burst on a random cadence between 5–15 seconds
  useEffect(() => {
    const randomDelay = () => 5000 + Math.random() * 10000;
    let activeTimer = null;
    let scheduleTimer = null;

    const triggerGlitch = () => {
      setIsGlitchActive(true);
      activeTimer = setTimeout(() => setIsGlitchActive(false), 950);
      scheduleTimer = setTimeout(triggerGlitch, randomDelay());
    };

    scheduleTimer = setTimeout(triggerGlitch, randomDelay());

    return () => {
      if (activeTimer) clearTimeout(activeTimer);
      if (scheduleTimer) clearTimeout(scheduleTimer);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { provider, block, txs } = await fetchLatestBlockAndTxs();
        const txCount = block.txCount ?? (Array.isArray(txs) ? txs.length : 0);
        const currentTime = parseSeconds(block.timestamp);
        const prevTime = parseSeconds(latest?.timestamp);

        if (!latest || latest.hash !== block.hash) {
          const txMeta = Array.isArray(txs)
            ? txs.map((tx, idx) => {
                const hash = typeof tx?.hash === 'string' ? tx.hash : `tx-${block?.hash || 'unknown'}-${idx}`;
                const sizeBytes =
                  typeof tx?.sizeBytes === 'number'
                    ? tx.sizeBytes
                    : typeof tx?.size === 'number'
                    ? tx.size
                    : null;
                return { ...tx, hash, sizeBytes };
              })
            : null;

          if (prevTime != null && currentTime != null) {
            const seconds = Math.max(1, currentTime - prevTime);
            setTxRate(txCount / seconds);
          } else {
            setTxRate(txCount ?? null);
          }
          setLatest(block);
          setRecentBlocks((prev) => [block, ...prev].slice(0, 50));
          if (txMeta && txMeta.length) {
            spawnOneColumnPerTx(txMeta);
          } else {
            spawnOneColumnPerTx(txCount || 0);
          }
          setActiveProvider(provider);
          setProviderErrors((prev) => ({ ...prev, block: null }));
        }
      } catch (err) {
        setProviderErrors((prev) => ({ ...prev, block: err.message || 'Failed to fetch block data' }));
      }
    };
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, [latest]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (latest?.timestamp) {
        const last = parseSeconds(latest.timestamp);
        if (last != null) {
          setTimeSinceBlock(Math.max(0, Math.floor(Date.now() / 1000 - last)));
        }
      } else {
        setTimeSinceBlock(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [latest]);

  // Optional debug toggle: continuously spawn drops without hitting the API to stress test rendering.
  useEffect(() => {
    if (isTestRainActive) {
      if (testSpawnRef.current) clearInterval(testSpawnRef.current);
      testSpawnRef.current = setInterval(() => {
        // Spawn a smaller burst for stress testing to curb performance impact.
        const burstSize = 2 + Math.floor(Math.random() * 2);
        spawnOneColumnPerTx(burstSize);
      }, 420);
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

  // Poll the number of active rain columns so we can surface a live counter in the UI
  // without tying setState to every animation frame.
  useEffect(() => {
    const id = setInterval(() => {
      setActiveDropCount(columnsRef.current.length);
    }, 400);
    return () => clearInterval(id);
  }, []);

  const averageTxPerBlock = useMemo(() => {
    if (!recentBlocks.length) return null;
    const slice = recentBlocks.slice(0, 10);
    const total = slice.reduce((sum, b) => sum + (b.txCount || 0), 0);
    return (total / slice.length).toFixed(1);
  }, [recentBlocks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prefer GPU compositing for the canvas layer when available; fallback to normal 2D.
    canvas.style.transform = 'translateZ(0)';
    const ctx =
      canvas.getContext('2d', { desynchronized: true }) || canvas.getContext('2d');

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
      // Track frame timing to dynamically clamp the number of active columns when
      // the render thread slows down, reducing sluggishness without changing how
      // transactions spawn columns.
      const now = performance.now();
      const delta = now - perfRef.current.lastFrameTime;
      perfRef.current.lastFrameTime = now;
      perfRef.current.frameDeltas.push(delta);
      if (perfRef.current.frameDeltas.length > 60) perfRef.current.frameDeltas.shift();
      const avgDelta =
        perfRef.current.frameDeltas.reduce((sum, d) => sum + d, 0) /
        perfRef.current.frameDeltas.length;
      const fps = avgDelta ? 1000 / avgDelta : 60;

      const scale = getScale();
      const baseFontSize = 24 * scale;
      const charSpacing = 26 * scale;
      const headGlow = 3 * scale;
      const shouldRotate = fps > 32;

      // Adaptive cap: if FPS drops, trim the oldest columns to keep the renderer responsive.
      const degradedMax = fps < 35 ? 420 : fps < 45 ? 580 : 760;
      const stressFactor = isTestRainActive ? 0.72 : 1;
      const maxColumns = Math.max(220, Math.floor(degradedMax * scale * stressFactor));
      if (columnsRef.current.length > maxColumns) {
        columnsRef.current = columnsRef.current.slice(-maxColumns);
      }

      // When under heavy load, draw fewer tail glyphs per column instead of skipping frames.
      // This keeps the animation smooth for stress tests while preserving spawn counts.
      const densityFactor = fps < 30 ? 0.4 : fps < 42 ? 0.6 : 1;

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
        const headSpan = Math.max(1, col.headHighlightCount || 1);

        const effectiveLength = Math.max(headSpan, Math.ceil(columnLength * densityFactor));

        for (let i = 0; i < effectiveLength; i++) {
          const glyph = col.glyphs[i] || nextGlyph();
          const distanceFromHead = i;
          const trailAlpha = Math.max(0, 1 - distanceFromHead / columnLength);
          const depthFade = Math.max(0, 1 - distanceFromHead * col.fadeRate);
          const opacity = Math.max(0, Math.min(trailAlpha * depthFade, 1));

          if (opacity <= 0.05) continue;

          const isHeadSegment = distanceFromHead < headSpan;
          const headIntensity = isHeadSegment
            ? Math.max(0.55, 1 - (distanceFromHead / headSpan) * 0.45)
            : 0;

          ctx.save();
          ctx.translate(col.x, col.y - i * charSpacing);
          if (shouldRotate) ctx.rotate(col.rotation);
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.globalAlpha = opacity;

          if (isHeadSegment) {
            // Head glyphs (1–3 for highlighted drops): brighter tip-only glow in cyan/white.
            if (col.highlighted) {
              ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * headIntensity})`;
              ctx.shadowColor = `rgba(215, 255, 255, ${0.85 * headIntensity})`;
              ctx.shadowBlur = headGlow * 2.6 * headIntensity;
            } else {
              ctx.fillStyle = `rgba(0, 225, 210, ${0.85 * headIntensity})`;
              ctx.shadowColor = `rgba(0, 225, 210, ${0.42 * headIntensity})`;
              ctx.shadowBlur = headGlow * headIntensity;
            }
          } else {
            // Tail glyphs: green→cyan hue with fading opacity, no glow.
            ctx.fillStyle = colors[col.hue];
          }

          ctx.fillText(glyph, 0, 0);
          ctx.restore();
        }

        // Reset per-column state to avoid shadow/alpha carry-over between columns.
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      });

      // Remove drops after their heads leave the viewport, but allow enough buffer for the
      // longer tails to finish fading so they are not culled too early.
      const offscreenMarginBase = 420 * getScale();
      columnsRef.current = columnsRef.current.filter((c) => {
        const tailAllowance = Math.max(offscreenMarginBase, c.length * charSpacing * 0.65);
        return c.y < canvas.height + tailAllowance;
      });

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
  }, [overlayMode, isTestRainActive]);

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
    { label: 'Avg Tx/Block (10)', value: averageTxPerBlock || '-' },
    { label: 'Block Size', value: blockSizeKb ? `${blockSizeKb} KB` : '-' },
    { label: 'Since Last Block', value: timeSinceBlock != null ? `${timeSinceBlock}s` : '...' }
  ];

  const providerLabel = (provider) => {
    const id = provider?.id || provider;
    if (id === 'midnight-indexer') return 'Midnight Indexer';
    if (id === 'midnight-testnet') return 'Midnight testnet gateway';
    if (id === 'blockfrost') return 'Blockfrost (preprod)';
    return 'Unknown';
  };

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
          <h2
            className={`glitch ${isGlitchActive ? 'glitch-active' : ''}`}
            data-text="LATEST BLOCK"
            style={{ fontSize: 'clamp(1.5rem, 3.6vw, 2.4rem)', margin: '0 0 0.6rem' }}
          >
            LATEST BLOCK
          </h2>
          <p style={{ fontSize: 'clamp(2.1rem, 6vw, 4rem)', margin: '0.3rem 0', color: '#f0f' }}>#{latest?.height || '...'}</p>
          <p style={{ margin: '0.8rem 0', fontSize: 'clamp(0.85rem, 2vw, 1.15rem)', wordBreak: 'break-all', opacity: 0.9 }}>Hash: {(latest?.hash || '').slice(0, 32)}...</p>
          <p style={{ fontSize: 'clamp(1.2rem, 3.2vw, 2rem)', color: '#0f0', marginTop: '0.8rem' }}>{recentBlocks[0]?.txCount || 0} transactions</p>
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
          <div
            style={{
              marginLeft: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(0, 255, 255, 0.08)',
              border: '1px solid rgba(0,255,255,0.2)',
              borderRadius: '10px',
              padding: '0.5rem 0.9rem',
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              color: '#0ff'
            }}
          >
            <span style={{ opacity: 0.7 }}>Active Drops:</span>
            <strong style={{ color: '#0f0' }}>{activeDropCount}</strong>
          </div>
        </div>

        <div
          style={{
            width: 'min(720px, 92vw)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.6rem',
            marginTop: '0.5rem'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(120deg, rgba(0, 255, 180, 0.12), rgba(0, 180, 255, 0.18))',
              border: '1px solid rgba(0,255,255,0.25)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: '#bdf',
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              boxShadow: '0 0 16px rgba(0,255,255,0.25)'
            }}
          >
            <div style={{ opacity: 0.65, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Block/Tx Provider</div>
            <div style={{ color: '#0ff', fontWeight: 700 }}>
              {activeProvider ? providerLabel(activeProvider) : 'Resolving...'}
            </div>
          </div>
        </div>

        {(providerErrors.block || !ALLOW_BLOCKFROST_FALLBACK) && (
          <div
            style={{
              width: 'min(720px, 92vw)',
              marginTop: '0.4rem',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(0,255,255,0.22)',
              background: 'rgba(0, 30, 50, 0.72)',
              color: '#bff',
              fontSize: 'clamp(0.78rem, 1.9vw, 0.95rem)',
              lineHeight: 1.5
            }}
          >
            <div style={{ fontWeight: 700, color: '#7fffd4' }}>Provider debug</div>
            {providerErrors.block && (
              <div style={{ marginTop: '0.2rem' }}>
                <span style={{ opacity: 0.7 }}>Block/Tx errors:</span> {providerErrors.block}
              </div>
            )}
            <div style={{ marginTop: '0.2rem', opacity: 0.8 }}>
              {ALLOW_BLOCKFROST_FALLBACK
                ? 'Blockfrost fallback enabled when both Midnight providers fail.'
                : 'Blockfrost fallback disabled; ensure Midnight Indexer or a custom testnet gateway URL/key are configured so data can load or enable REACT_APP_ALLOW_BLOCKFROST_FALLBACK.'}
            </div>
          </div>
        )}

        <div style={{ width: 'min(720px, 92vw)', padding: '1.15rem 1.25rem', background: 'rgba(0,20,40,0.95)', border: '2px solid #0ff', borderRadius: '16px', boxShadow: '0 0 30px #0ff', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', fontSize: 'clamp(0.8rem, 1.6vw, 1.05rem)', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
          {stats.map(stat => (
            <div key={stat.label} className="stat-card">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{stat.value}</span>
            </div>
          ))}
        </div>

        <footer style={{ marginTop: 'auto', paddingBottom: '3vh', opacity: 0.7, fontSize: 'clamp(0.95rem, 2vw, 1.3rem)' }}>
          <span className={`glitch ${isGlitchActive ? 'glitch-active' : ''}`} data-text="shhh...">shhh...</span> nothing ever happened
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
            <div key={b.hash} className={`timeline-row ${i === 0 ? 'timeline-row-latest' : ''}`}>
              <span className="timeline-height">#{b.height}</span>
              <span className="timeline-tx">{b.txCount || 0} tx</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
