import React, { useState, useEffect } from 'react';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [txPerSecond, setTxPerSecond] = useState(0);

  // Fetch blocks
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
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [latest, recentBlocks]);

  // Epoch countdown
  useEffect(() => {
    let epochEnd = null;
    const fetchEpoch = async () => {
      const r = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY } });
      const e = await r.json();
      epochEnd = e.end_time * 1000;
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
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#0ff', fontFamily: '"Courier New", monospace' }}>

      {/* Title */}
      <h1 className="glitch-title" style={{ textAlign: 'center', margin: '4vh 0 1vh', fontSize: '6vw' }}>
        MIDNIGHT
      </h1>
      <p style={{ textAlign: 'center', margin: '0 0 4vh', fontSize: '2.8vw', opacity: 0.9 }}>
        EXPLORER
      </p>

      {/* Main Card */}
      <div style={{
        position: 'absolute',
        top: '48%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(720px, 90vw)',
        padding: '3rem',
        background: 'rgba(0,15,30,0.95)',
        border: '2px solid #0ff',
        borderRadius: '20px',
        boxShadow: '0 0 50px #0ff',
        textAlign: 'center',
        zIndex: 20
      }}>
        <h2 className="glitch" style={{ fontSize: '2.4rem', margin: '0 0 1rem' }}>LATEST BLOCK</h2>
        <p style={{ fontSize: '4rem', margin: '0.5rem 0', color: '#f0f' }}>#{latest?.height || '...'}</p>
        <p style={{ margin: '1rem 0', fontSize: '1rem', wordBreak: 'break-all' }}>
          Hash: {(latest?.hash || '').slice(0, 32)}...
        </p>
        <p style={{ fontSize: '2rem', color: '#0f0' }}>
          {recentBlocks[0]?.tx_count || 0} transactions
        </p>
      </div>

      {/* DASHBOARD — directly under Main Card, no overlap */}
      <div style={{
        position: 'absolute',
        top: '58%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 90vw)',
        padding: '1.2rem 2rem',
        background: 'rgba(0,20,40,0.9)',
        border: '2px solid #0ff',
        borderRadius: '16px',
        boxShadow: '0 0 30px #0ff',
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
        zIndex: 20,
        textAlign: 'center'
      }}>
        <div>Tx/s <span style={{ color: '#0f0', fontWeight: 'bold' }}>{txPerSecond.toFixed(1)}</span></div>
        <div>Total Blocks <span style={{ color: '#0f0', fontWeight: 'bold' }}>{latest?.height || '-'}</span></div>
        <div>Epoch Ends In <span style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</span></div>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'absolute',
        bottom: '3vh',
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: 0.7,
        fontSize: '1.2rem',
        zIndex: 10
      }}>
        <span className="glitch">shhh...</span> nothing ever happened
      </footer>

      {/* Timeline */}
      <div style={{
        position: 'absolute',
        top: '12vh',
        right: '2vw',
        width: '340px',
        maxHeight: '76vh',
        overflowY: 'auto',
        background: 'rgba(0,10,30,0.9)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '2px solid #0ff',
        boxShadow: '0 0 40px rgba(0,255,255,0.4)',
        zIndex: 10
      }}>
        {recentBlocks.slice(0, 30).map((b, i) => (
          <div key={b.hash} style={{ padding: '0.8rem 0', borderBottom: '1px dashed #033', color: i === 0 ? '#0f0' : '#0ff' }}>
            <span style={{ float: 'left' }}>#{b.height}</span>
            <span style={{ float: 'right' }}>{b.tx_count || 0} tx</span>
            <div style={{ clear: 'both' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;   // THIS LINE WAS MISSING BEFORE
