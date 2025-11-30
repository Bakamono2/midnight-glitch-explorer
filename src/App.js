 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/App.js b/src/App.js
index ad74a2b181041119b4a5330c0a754e429537cfcb..185c531de6d2c21219f3a0392c41d50161bdefe4 100644
--- a/src/App.js
+++ b/src/App.js
@@ -1,117 +1,142 @@
-import React, { useState, useEffect, useRef } from 'react';
+import React, { useState, useEffect, useRef, useMemo } from 'react';
 import './App.css';
 
 const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
 const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';
 
 function App() {
   const [latest, setLatest] = useState(null);
   const [recentBlocks, setRecentBlocks] = useState([]);
   const [timeLeft, setTimeLeft] = useState('Loading...');
   const [isTimelineOpen, setIsTimelineOpen] = useState(true);
+  const [txRate, setTxRate] = useState(null);
+  const [timeSinceBlock, setTimeSinceBlock] = useState(null);
 
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
+          if (latest?.time && block.time) {
+            const seconds = Math.max(1, block.time - latest.time);
+            const txCount = block.tx_count ?? txs.length;
+            setTxRate(txCount / seconds);
+          } else {
+            setTxRate(block.tx_count ?? txs.length ?? null);
+          }
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
 
+  useEffect(() => {
+    const timer = setInterval(() => {
+      if (latest?.time) {
+        setTimeSinceBlock(Math.max(0, Math.floor(Date.now() / 1000 - latest.time)));
+      }
+    }, 1000);
+    return () => clearInterval(timer);
+  }, [latest]);
+
+  const averageTxPerBlock = useMemo(() => {
+    if (!recentBlocks.length) return null;
+    const slice = recentBlocks.slice(0, 10);
+    const total = slice.reduce((sum, b) => sum + (b.tx_count || 0), 0);
+    return (total / slice.length).toFixed(1);
+  }, [recentBlocks]);
+
   // YOUR ORIGINAL, WORKING DIGITAL RAIN — 100% UNCHANGED FROM WHEN IT WORKED
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
@@ -128,76 +153,101 @@ function App() {
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
 
+  const blockSizeKb = useMemo(() => (latest?.size ? (latest.size / 1024).toFixed(1) : null), [latest]);
+
+  const stats = [
+    { label: 'Tx/s', value: txRate != null ? txRate.toFixed(2) : '...' },
+    { label: 'Total Blocks', value: latest?.height || '-' },
+    { label: 'Epoch Ends In', value: timeLeft },
+    { label: 'Avg Tx/Block (10)', value: averageTxPerBlock || '-' },
+    { label: 'Block Size', value: blockSizeKb ? `${blockSizeKb} KB` : '-' },
+    { label: 'Since Last Block', value: timeSinceBlock != null ? `${timeSinceBlock}s` : '...' }
+  ];
+
   return (
     <>
       <link href="https://fonts.googleapis.com/css2?family=Matrix+Code+NFI&display=swap" rel="stylesheet" />
 
-      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />
+      <canvas
+        ref={canvasRef}
+        style={{
+          position: 'fixed',
+          top: 0,
+          left: 0,
+          width: '100%',
+          height: '100%',
+          zIndex: 1,
+          pointerEvents: 'none'
+        }}
+      />
 
-      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', color: '#0ff', fontFamily: '"Courier New", monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4vh', padding: '4vh 5vw' }}>
+      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', color: '#0ff', fontFamily: '"Courier New", monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh', padding: '3vh 5vw' }}>
         <div style={{ textAlign: 'center' }}>
-          <h1 className="glitch-title" style={{ margin: '0 0 1vh', fontSize: 'clamp(3rem, 8vw, 8rem)' }}>MIDNIGHT</h1>
-          <p style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 3rem)', opacity: 0.9 }}>EXPLORER</p>
+          <h1 className="glitch-title" style={{ margin: '0 0 0.5vh', fontSize: 'clamp(2.8rem, 7vw, 6.5rem)' }}>MIDNIGHT</h1>
+          <p style={{ margin: 0, fontSize: 'clamp(1.2rem, 3.5vw, 2.4rem)', opacity: 0.9, letterSpacing: '0.25em' }}>EXPLORER</p>
         </div>
 
-        <div style={{ width: 'min(720px, 90vw)', padding: '3rem', background: 'rgba(0,15,30,0.95)', border: '2px solid #0ff', borderRadius: '20px', boxShadow: '0 0 50px #0ff', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
-          <h2 className="glitch" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', margin: '0 0 1rem' }}>LATEST BLOCK</h2>
-          <p style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', margin: '0.5rem 0', color: '#f0f' }}>#{latest?.height || '...'}</p>
-          <p style={{ margin: '1rem 0', fontSize: 'clamp(0.8rem, 1.8vw, 1.2rem)', wordBreak: 'break-all' }}>Hash: {(latest?.hash || '').slice(0, 32)}...</p>
-          <p style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: '#0f0' }}>{recentBlocks[0]?.tx_count || 0} transactions</p>
+        <div style={{ width: 'min(720px, 92vw)', padding: '2.4rem', background: 'rgba(0,15,30,0.95)', border: '2px solid #0ff', borderRadius: '20px', boxShadow: '0 0 50px #0ff', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
+          <h2 className="glitch" style={{ fontSize: 'clamp(1.5rem, 3.6vw, 2.4rem)', margin: '0 0 0.6rem' }}>LATEST BLOCK</h2>
+          <p style={{ fontSize: 'clamp(2.1rem, 6vw, 4rem)', margin: '0.3rem 0', color: '#f0f' }}>#{latest?.height || '...'}</p>
+          <p style={{ margin: '0.8rem 0', fontSize: 'clamp(0.85rem, 2vw, 1.15rem)', wordBreak: 'break-all', opacity: 0.9 }}>Hash: {(latest?.hash || '').slice(0, 32)}...</p>
+          <p style={{ fontSize: 'clamp(1.2rem, 3.2vw, 2rem)', color: '#0f0', marginTop: '0.8rem' }}>{recentBlocks[0]?.tx_count || 0} transactions</p>
         </div>
 
-        <div style={{ width: 'min(720px, 90vw)', padding: '1.4rem 2rem', background: 'rgba(0,20,40,0.95)', border: '2px solid #0ff', borderRadius: '16px', boxShadow: '0 0 35px #0ff', display: 'flex', justifyContent: 'space-around', fontSize: 'clamp(1.1rem, 2.2vw, 1.8rem)', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
-          <div>Tx/s <span style={{ color: '#0f0', fontWeight: 'bold' }}>0.0</span></div>
-          <div>Total Blocks <span style={{ color: '#0f0', fontWeight: 'bold' }}>{latest?.height || '-'}</span></div>
-          <div>Epoch Ends In <span style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</span></div>
+        <div style={{ width: 'min(900px, 96vw)', padding: '1.2rem 1.4rem', background: 'rgba(0,20,40,0.95)', border: '2px solid #0ff', borderRadius: '16px', boxShadow: '0 0 30px #0ff', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', fontSize: 'clamp(0.95rem, 2.4vw, 1.25rem)', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
+          {stats.map(stat => (
+            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.6rem', background: 'rgba(0,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,255,255,0.2)' }}>
+              <span style={{ opacity: 0.85, fontSize: '0.9em', letterSpacing: '0.04em' }}>{stat.label}</span>
+              <span style={{ color: '#0f0', fontWeight: 'bold', fontSize: '1.2em' }}>{stat.value}</span>
+            </div>
+          ))}
         </div>
 
-        <footer style={{ marginTop: 'auto', paddingBottom: '3vh', opacity: 0.7, fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}>
+        <footer style={{ marginTop: 'auto', paddingBottom: '3vh', opacity: 0.7, fontSize: 'clamp(0.95rem, 2vw, 1.3rem)' }}>
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
@@ -206,46 +256,45 @@ function App() {
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
-          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
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
 
EOF
)
