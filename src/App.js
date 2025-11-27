import React, { useState, useEffect } from 'react';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');

  // Fetch latest block
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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      color: '#0ff',
      fontFamily: '"Courier New", monospace',
      overflow: 'hidden'
    }}>
      {/* Title */}
      <h1 className="glitch-title" style={{ textAlign: 'center', margin: '4vh 0 2vh', fontSize: '6vw' }}>
        MIDNIGHT
      </h1>
      <p style={{ textAlign: 'center', margin: '0 0 6vh', fontSize: '2.5vw', opacity: 0.9 }}>
        EXPLORER
      </p>

      {/* Main Card - perfectly centered */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(720px, 90vw)',
        padding: '3rem',
        background: 'rgba(0, 15, 30, 0.9)',
        border: '2px solid #0ff',
        borderRadius: '20px',
        boxShadow: '0 0 40px #0ff',
        textAlign: 'center'
      }}>
        <h2 className="glitch" style={{ fontSize: '2.2rem', margin: '0 0 1rem' }}>LATEST BLOCK</h2>
        <p style={{ fontSize: '3.5rem', margin: '0.5rem 0', color: '#f0f' }}>
          #{latest?.height || '...'}
        </p>
        <p style={{ margin: '0.8rem 0', wordBreak: 'break-all' }}>
          Hash: {(latest?.hash || '').slice(0, 32)}...
        </p>
        <p style={{ fontSize: '1.8rem', color: '#0f0' }}>
          {recentBlocks[0]?.tx_count || 0} transactions
        </p>
      </div>

      {/* Epoch Clock - bottom center */}
      <div style={{
        position: 'absolute',
        bottom: '14vh',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '1rem 3rem',
        background: 'rgba(0,0,0,0.8)',
        border: '2px solid #f0f',
        borderRadius: '50px',
        boxShadow: '0 0 30px #f0f',
        fontSize: '2rem',
        whiteSpace: 'nowrap'
      }}>
        EPOCH ENDS IN <span style={{ color: '#ff0' }}>{timeLeft}</span>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'absolute',
        bottom: '4vh',
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: 0.7,
        fontSize: '1.1rem'
      }}>
        <span className="glitch">shhh...</span> nothing ever happened
      </footer>

      {/* Timeline - right side */}
      <div style={{
        position: 'absolute',
        top: '12vh',
        right: '2vw',
        width: '340px',
        maxHeight: '75vh',
        overflowY: 'auto',
        background: 'rgba(0,10,30,0.8)',
        borderRadius: '15px',
        padding: '1.5rem',
        border: '1px solid #0ff',
        boxShadow: '0 0 30px rgba(0,255,255,0.3)'
      }}>
        <div className="timeline">
          {recentBlocks.slice(0, 25).map((b, i) => (
            <div key={b.hash} style={{ 
              padding: '0.6rem 0', 
              borderBottom: i < 24 ? '1px solid #033' : 'none',
              color: i === 0 ? '#0f0' : '#0ff'
            }}>
              <span style={{ float: 'left' }}>#{b.height}</span>
              <span style={{ float: 'right' }}>{b.tx_count || 0} tx</span>
              <div style={{ clear: 'both' }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
