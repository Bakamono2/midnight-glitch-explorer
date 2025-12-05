import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import { fetchLatestBlockAndTxs, isBlockfrostAllowed } from './providers';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [txRate, setTxRate] = useState(null);
  const [isTestRainActive, setIsTestRainActive] = useState(false);
  const [activeDropCount, setActiveDropCount] = useState(0);
  const [isGlitchActive, setIsGlitchActive] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerErrors, setProviderErrors] = useState({ block: null });
  const [uiVisible, setUiVisible] = useState(true);
  const [debugVisible, setDebugVisible] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleLines, setConsoleLines] = useState([
    { type: 'system', text: 'midnight:// type "help" for commands' }
  ]);

  const canvasRef = useRef(null);
  const columnsRef = useRef([]);
  const animationRef = useRef(null);
  const testSpawnRef = useRef(null);
  const perfRef = useRef({
    lastFrameTime: performance.now(),
    frameDeltas: []
  });
  const lastSeenHeightRef = useRef(null);
  const bigBlockStatsRef = useRef({
    initialized: false,
    avgScore: 0,
    lastPulseAt: 0,
    pulse: {
      active: false,
      startedAt: 0,
      durationMs: 1600
    }
  });
  const consoleLogRef = useRef(null);

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

    // Track block-level heft for a subtle scanline pulse when an unusually large block lands.
    const stats = bigBlockStatsRef.current;
    let blockScore = 0;
    if (Array.isArray(txs) && txs.length > 0) {
      for (const tx of txs) {
        if (tx && typeof tx.sizeBytes === 'number' && isFinite(tx.sizeBytes)) {
          blockScore += Math.max(0, tx.sizeBytes);
        }
      }
    }

    if (blockScore > 0) {
      const now = Date.now();
      const alpha = 0.12;

      if (!stats.initialized) {
        stats.initialized = true;
        stats.avgScore = blockScore;
      } else {
        stats.avgScore = (1 - alpha) * stats.avgScore + alpha * blockScore;
      }

      const isBigBlock = stats.initialized && blockScore > stats.avgScore * 1.8 && txs.length >= 5;
      const minPulseGapMs = 30000;
      const canPulse = now - stats.lastPulseAt > minPulseGapMs;

      if (isBigBlock && canPulse) {
        stats.lastPulseAt = now;
        stats.pulse.active = true;
        stats.pulse.startedAt = now;
        stats.pulse.durationMs = 1600;
      }
    }

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

      let importanceBand;
      if (imp < 0.33) {
        importanceBand = 0;
      } else if (imp < 0.66) {
        importanceBand = 1;
      } else {
        importanceBand = 2;
      }

      let hueIndex = 0;
      if (importanceBand === 0) {
        hueIndex = 0; // calmer teal for low-importance txs
      } else if (importanceBand === 1) {
        hueIndex = 2; // mid-bright cyan for medium importance
      } else {
        hueIndex = 1; // punchier green/cyan for high importance
      }

      const baseHighlightChance = 0.18;
      const extraHighlightChance = imp * 0.42;
      const highlightChance = Math.max(0, Math.min(1, baseHighlightChance + extraHighlightChance));
      const highlighted = Math.random() < highlightChance;
      const headHighlightCount = highlighted ? 1 + Math.floor(Math.random() * 3) : 1;
      const baseGlitchChance = 0.004;
      const extraGlitchChance = imp * 0.006;
      const glitchChance = Math.max(0, Math.min(1, baseGlitchChance + extraGlitchChance));
      const glitchHead = Math.random() < glitchChance;
      const rotation = (0.04 + Math.random() * 0.08) * (Math.random() < 0.5 ? -1 : 1);

      columnsRef.current.push({
        x: safeMargin + Math.random() * (window.innerWidth - 2 * safeMargin),
        y: -200 - Math.random() * 600,
        speed,
        // Enforce drop length between 24 and 64 glyphs (trail + head) with a skew toward longer trails,
        // now lightly influenced by tx size when available.
        length: computeTailLength(meta.sizeBytes),
        headPos: Math.random() * 8,
        hue: hueIndex,
        fadeRate: 0.045 + Math.random() * 0.05,
        trailJitter: Math.random() * 0.4,
        // Random highlight flag (visual-only) to let some heads pop with a white glow.
        highlighted,
        glitchHead,
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

  // Keep the console log scrolled to the newest entry when visible/open
  useEffect(() => {
    if (!consoleVisible || !consoleOpen) return;

    const el = consoleLogRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [consoleLines, consoleVisible, consoleOpen]);

  // Secret shortcuts to toggle the midnight console visibility (Ctrl+Alt+M primary, backtick fallback)
  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true');

      if (isInput) return;

      const key = event.key;
      const lowerKey = typeof key === 'string' ? key.toLowerCase() : key;
      const code = event.code;

      const isCtrlAltM = event.ctrlKey && event.altKey && (lowerKey === 'm' || code === 'KeyM');
      const isBacktick = !event.ctrlKey && !event.altKey && !event.shiftKey && (key === '`' || code === 'Backquote');

      if (isCtrlAltM || isBacktick) {
        console.log('[midnight-console] hotkey detected:', {
          key,
          code,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey
        });

        event.preventDefault();

        setConsoleVisible((visible) => {
          const nextVisible = !visible;

          if (nextVisible) {
            setConsoleOpen(true);
          }

          return nextVisible;
        });
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const sanitizeTxMeta = (txs, blockHash) => {
        if (!Array.isArray(txs)) return null;
        return txs.map((tx, idx) => {
          const hash = typeof tx?.hash === 'string' ? tx.hash : `tx-${blockHash || 'unknown'}-${idx}`;
          const sizeBytes =
            typeof tx?.sizeBytes === 'number'
              ? tx.sizeBytes
              : typeof tx?.size === 'number'
              ? tx.size
              : null;
          return { ...tx, hash, sizeBytes };
        });
      };

      const buildHeaders = (provider) => {
        const headers = { 'Content-Type': 'application/json' };
        if (provider?.authHeaderName && provider?.authHeaderValue) {
          headers[provider.authHeaderName] = provider.authHeaderValue;
        }
        return headers;
      };

      const fetchProviderJson = async (provider, path) => {
        const resp = await fetch(`${provider.baseUrl}${path}`, { headers: buildHeaders(provider) });
        if (!resp.ok) throw new Error(`status ${resp.status}`);
        return resp.json();
      };

      const processBlock = async (blockData, txList, prevBlockForRate, provider) => {
        const txCount = blockData.txCount ?? (Array.isArray(txList) ? txList.length : 0);
        const currentTime = parseSeconds(blockData.timestamp);
        const prevTime = parseSeconds(prevBlockForRate?.timestamp);

        if (prevTime != null && currentTime != null) {
          const seconds = Math.max(1, currentTime - prevTime);
          setTxRate(txCount / seconds);
        } else {
          setTxRate(txCount ?? null);
        }

        setLatest(blockData);
        setRecentBlocks((prev) => {
          const filtered = prev.filter((b) => b.hash !== blockData.hash);
          return [blockData, ...filtered].slice(0, 50);
        });

        const txMeta = sanitizeTxMeta(txList, blockData.hash);
        if (txMeta && txMeta.length) {
          spawnOneColumnPerTx(txMeta);
        } else {
          spawnOneColumnPerTx(txCount || 0);
        }

        setActiveProvider(provider);
        setProviderErrors((prev) => ({ ...prev, block: null }));
      };

      try {
        const { provider, block, txs } = await fetchLatestBlockAndTxs();
        const latestHeight = block?.height;
        const prevHeight = lastSeenHeightRef.current;

        if (!Number.isFinite(latestHeight)) {
          await processBlock(block, txs, latest, provider);
          lastSeenHeightRef.current = latestHeight ?? null;
          return;
        }

        if (prevHeight == null) {
          await processBlock(block, txs, latest, provider);
          lastSeenHeightRef.current = latestHeight;
          return;
        }

        if (latestHeight <= prevHeight) {
          setActiveProvider(provider);
          return;
        }

        if (latestHeight === prevHeight + 1) {
          await processBlock(block, txs, latest, provider);
          lastSeenHeightRef.current = latestHeight;
          return;
        }

        const fromHeight = prevHeight + 1;
        try {
          const missingBlocks = await fetchProviderJson(provider, `/blocks/latest?fromHeight=${fromHeight}`);
          if (Array.isArray(missingBlocks) && missingBlocks.length) {
            let prevBlock = latest;
            for (const missing of missingBlocks) {
              let blockTxs = null;
              try {
                if (missing?.hash) {
                  blockTxs = await fetchProviderJson(provider, `/blocks/${missing.hash}/txs`);
                }
              } catch (txErr) {
                console.error('[midnight] tx fetch failed during catch-up', txErr);
              }
              await processBlock(missing, blockTxs, prevBlock, provider);
              prevBlock = missing;
            }
            lastSeenHeightRef.current = missingBlocks[missingBlocks.length - 1].height;
            return;
          }
        } catch (rangeErr) {
          console.error('[midnight] failed to fetch missing blocks range', rangeErr);
        }

        await processBlock(block, txs, latest, provider);
        lastSeenHeightRef.current = latestHeight;
      } catch (err) {
        setProviderErrors((prev) => ({ ...prev, block: err.message || 'Failed to fetch block data' }));
      }
    };
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
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

  const handleConsoleSubmit = (event) => {
    event.preventDefault();
    const raw = consoleInput.trim();
    if (!raw) return;

    const lower = raw.toLowerCase();
    const tokens = lower.split(/\s+/);

    const pushLines = (newLines) => {
      setConsoleLines((prev) => {
        const merged = [...prev, ...newLines];
        return merged.slice(-40);
      });
    };

    const inputLine = { type: 'input', text: `> ${raw}` };

    let response = null;
    const cmd = tokens[0];
    const arg = tokens[1];

    if (cmd === 'help') {
      response = 'commands: help, debug on/off, ui hide/show, stress on/off, clear';
    } else if (cmd === 'clear') {
      setConsoleLines([{ type: 'system', text: 'midnight:// console cleared' }]);
      setConsoleInput('');
      return;
    } else if (cmd === 'debug' && (arg === 'on' || arg === 'off')) {
      const next = arg === 'on';
      setDebugVisible(next);
      response = `debug ${arg} (debug panels ${next ? 'visible' : 'hidden'})`;
    } else if (cmd === 'ui' && (arg === 'hide' || arg === 'show')) {
      const next = arg === 'show';
      setUiVisible(next);
      response = `ui ${arg} (HUD ${next ? 'shown' : 'hidden'})`;
    } else if (cmd === 'stress' && (arg === 'on' || arg === 'off')) {
      if (typeof setIsTestRainActive === 'function') {
        const next = arg === 'on';
        setIsTestRainActive(next);
        response = `stress ${arg} (rain stress test ${next ? 'enabled' : 'disabled'})`;
      } else {
        response = 'ERR: stress control not wired (setIsTestRainActive missing)';
      }
    } else {
      response = `ERR: unknown command "${raw}" (type "help")`;
    }

    const respLine = { type: 'system', text: response };
    pushLines([inputLine, respLine]);
    setConsoleInput('');
  };

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
      const nowMs = Date.now();

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

      const pulse = bigBlockStatsRef.current.pulse;
      let pulseLineY = null;
      let pulseAlpha = 0;

      if (pulse.active) {
        const elapsed = nowMs - pulse.startedAt;
        if (elapsed >= pulse.durationMs) {
          pulse.active = false;
        } else {
          const progress = elapsed / pulse.durationMs;
          pulseLineY = canvas.height * progress;
          const centerDist = Math.abs(progress - 0.5) / 0.5;
          const intensity = Math.max(0, 1 - centerDist);
          pulseAlpha = 0.16 * intensity;
        }
      }

      if (pulseLineY !== null && pulseAlpha > 0) {
        ctx.save();
        const bandHeight = 80 * getScale();
        const y0 = pulseLineY - bandHeight / 2;
        const y1 = pulseLineY + bandHeight / 2;

        const grad = ctx.createLinearGradient(0, y0, 0, y1);
        grad.addColorStop(0, 'rgba(0, 255, 210, 0)');
        grad.addColorStop(0.5, `rgba(0, 255, 210, ${pulseAlpha})`);
        grad.addColorStop(1, 'rgba(0, 255, 210, 0)');

        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillRect(0, y0, canvas.width, bandHeight);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }

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

          if (isHeadSegment && col.glitchHead) {
            const jitter = 2 * scale;
            const offsetX = (Math.random() - 0.5) * jitter;
            ctx.translate(offsetX, 0);
          }

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

  const activityStats = useMemo(() => {
    if (!recentBlocks?.length) {
      return { blocks10m: 0, tx10m: 0, avgBlockSizeKb: null };
    }

    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    const blocksLast10 = recentBlocks.filter((b) => {
      if (!b?.timestamp) return false;
      const t = typeof b.timestamp === 'number' ? b.timestamp : Date.parse(b.timestamp);
      if (!Number.isFinite(t)) return false;
      return now - t <= tenMinutes;
    });

    const blocks10m = blocksLast10.length;
    const tx10m = blocksLast10.reduce((sum, b) => sum + (typeof b?.txCount === 'number' ? b.txCount : 0), 0);

    const last50 = recentBlocks.slice(0, 50);
    const sizes = last50
      .map((b) => (typeof b?.size === 'number' ? b.size : null))
      .filter((v) => v != null);

    const avgBlockSizeKb = sizes.length ? sizes.reduce((sum, v) => sum + v, 0) / sizes.length / 1024 : null;

    return { blocks10m, tx10m, avgBlockSizeKb };
  }, [recentBlocks]);

  const stats = [
    { label: 'Tx/s', value: txRate != null ? txRate.toFixed(2) : '...' },
    { label: 'Avg Tx/Block (10)', value: averageTxPerBlock || '-' },
    { label: 'Block Size', value: blockSizeKb ? `${blockSizeKb} KB` : '-' },
    {
      label: 'Blocks (10 min)',
      value: activityStats.blocks10m != null ? activityStats.blocks10m : '—'
    },
    {
      label: 'Tx (10 min)',
      value: activityStats.tx10m != null ? activityStats.tx10m.toLocaleString() : '—'
    },
    {
      label: 'Avg Block Size (50)',
      value:
        activityStats.avgBlockSizeKb != null ? `${activityStats.avgBlockSizeKb.toFixed(1)} kB` : '—'
    }
  ];

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '—';
    const value = typeof timestamp === 'number' ? timestamp * 1000 : Date.parse(timestamp);
    if (!Number.isFinite(value)) return '—';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  };

  const providerLabel = (provider) => {
    const id = provider?.id || provider;
    if (id === 'midnight-indexer') return 'Midnight Indexer';
    if (id === 'midnight-testnet') return 'Midnight testnet gateway';
    if (id === 'blockfrost') return 'Blockfrost (preprod)';
    return 'Unknown';
  };

  const latestHeight = latest?.height ?? null;
  const latestHashDisplay = latest?.hash
    ? `${latest.hash.slice(0, 28)}…${latest.hash.slice(-6)}`
    : '—';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />

      <div className="app-root">
        <canvas ref={canvasRef} className="rain-canvas" />

        <div className="ui-toggle-container">
          <button
            type="button"
            className="ui-toggle-button"
            onClick={() => setUiVisible((prev) => !prev)}
          >
            {uiVisible ? 'Hide UI' : 'Show UI'}
          </button>
        </div>

        {consoleVisible && (
          <div
            className={`midnight-console${consoleOpen ? ' midnight-console--open' : ' midnight-console--collapsed'}`}
          >
            <div className="midnight-console-header" onClick={() => setConsoleOpen((open) => !open)}>
              <span className="midnight-console-title">midnight://</span>
              <span className="midnight-console-toggle">{consoleOpen ? '▾' : '▴'}</span>
            </div>

            {consoleOpen && (
              <div className="midnight-console-body">
                <div className="midnight-console-log" ref={consoleLogRef}>
                  {consoleLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`console-line${line.type ? ` console-line--${line.type}` : ''}`}
                    >
                      {line.text}
                    </div>
                  ))}
                </div>

                <form className="midnight-console-input-row" onSubmit={handleConsoleSubmit}>
                  <span className="midnight-console-prompt">midnight://</span>
                  <input
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="midnight-console-input"
                    placeholder="type a command, e.g. `help`"
                  />
                </form>
              </div>
            )}
          </div>
        )}

        {uiVisible ? (
          <div className="hud-shell">
            <header className="hud-header glass-edge">
              <div className="logo-lockup">
                <div
                  className={`logo-main glitch ${isGlitchActive ? 'glitch-active' : ''}`}
                  data-text="MIDNIGHT"
                >
                  MIDNIGHT
                </div>
                <div className="logo-sub">EXPLORER</div>
              </div>
            </header>

            <main className="hud-main">
            <section
              className={`panel latest-block-panel glass-panel ${
                debugVisible ? 'latest-block-panel--with-debug' : 'latest-block-panel--no-debug'
              }`}
            >
                <div className="latest-block-top">
                  <div className="latest-block-header-row">
                    <div className="latest-block-label">LATEST BLOCK</div>
                    <div className="latest-block-live-badge">LIVE</div>
                  </div>

                  <div className="latest-block-number">#{latest?.height ?? '—'}</div>

                  <div className="latest-block-meta">
                    <span>{`${latest?.txCount ?? 0} tx`}</span>
                    <span>{blockSizeKb ? `${blockSizeKb} kB` : '—'}</span>
                    <span>{formatTimeAgo(latest?.timestamp)}</span>
                  </div>

                  <div className="latest-block-hash">Hash: {latestHashDisplay}</div>
                </div>

                {debugVisible && (
                  <div className="latest-block-footer debug-controls">
                    <button
                      type="button"
                      className="stress-button"
                      onClick={() => setIsTestRainActive((prev) => !prev)}
                    >
                      {isTestRainActive ? 'Stop Rain Stress Test' : 'Start Rain Stress Test'}
                    </button>
                    <div className="active-drops-pill">
                      <span>Active Drops:</span>
                      <strong>{activeDropCount}</strong>
                    </div>
                  </div>
                )}
              </section>

              <aside className="glass-panel timeline-panel">
                <div className="panel-heading">
                  <span className="eyebrow">Recent Blocks</span>
                  <span className="eyebrow">{recentBlocks.length ? `${recentBlocks.length} tracked` : '—'}</span>
                </div>
                <div className="timeline-scroll">
                  <div className="timeline-list">
                    {recentBlocks.map((b, i) => {
                      const isActive = latestHeight != null && b?.height === latestHeight;
                      return (
                        <div
                          key={b.hash || i}
                          className={`recent-block-row${isActive ? ' recent-block-row--active' : ''}`}
                        >
                          <span className="recent-block-height">#{b?.height ?? '—'}</span>
                          <span className="recent-block-tx">{b?.txCount ?? 0} tx</span>
                          <span className="recent-block-age">{formatTimeAgo(b?.timestamp)}</span>
                        </div>
                      );
                    })}
                    {!recentBlocks.length && <div className="recent-block-age">Waiting for blocks…</div>}
                  </div>
                </div>
              </aside>
            </main>

            <section className="stats-strip">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-chip">
                  <span className="stat-chip-label">{stat.label}</span>
                  <span className="stat-chip-value">{stat.value}</span>
                </div>
              ))}
            </section>

            <section className="panel footer-panel glass-panel">
              <div className="footer-row footer-row-primary">
                <div className="footer-brand">MIDNIGHT TESTNET-02 · LIVE</div>
                <div className="footer-message">Listening for new blocks…</div>
                <div className="footer-hints">
                  <span className="footer-hint">[H] Hide UI</span>
                  <span className="footer-hint">[`] Console</span>
                </div>
              </div>

              {debugVisible && (
                <div className="footer-row footer-row-debug debug-panel">
                  <div className="provider-title">Provider Status</div>
                  <div className="provider-line">
                    Block/Tx Provider: <span className="accent">{activeProvider ? providerLabel(activeProvider) : 'Resolving...'}</span>
                  </div>
                  {providerErrors.block && (
                    <div className="provider-error">Block/Tx errors: {providerErrors.block}</div>
                  )}
                  <div className="provider-note">
                    {ALLOW_BLOCKFROST_FALLBACK
                      ? 'Blockfrost fallback enabled when both Midnight providers fail.'
                      : 'Blockfrost fallback disabled; configure Midnight Indexer or a custom testnet gateway so data can load.'}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="hud-minimal-footer">MIDNIGHT TESTNET · live blocks</div>
        )}
      </div>
    </>
  );

}

export default App;
