import React, { useState, useEffect } from 'react';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [timeLeft, setTimeLeft] = useState('Loading...');
  const [txPerSecond, setTxPerSecond] = useState(0);
  const [showTimeline, setShowTimeline] = useState(window.innerWidth >= 1100);

  // Update timeline visibility on resize
  useEffect(() => {
    const handleResize = () => setShowTimeline(window.innerWidth >= 1100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rest of fetching logic unchanged (same as above)...

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#0ff', fontFamily: '"Courier New", monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4vh', padding: '4vh 5vw', position: 'relative', overflow: 'hidden' }}>
      {/* Title, Main Card, Dashboard, Footer — exactly as before */}
      {/* ... (same code from previous message) ... */}

      {/* TIMELINE — only renders when screen is wide enough */}
      {showTimeline && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: 0,
          transform: 'translateY(-50%)',
          width: 'clamp(300px, 28vw, 380px)',
          maxHeight: '85vh',
          background: 'rgba(0,10,30,0.94)',
          borderLeft: '2px solid #0ff',
          borderTop: '2px solid #0ff',
          borderBottom: '2px solid #0ff',
          borderRadius: '16px 0 0 16px',
          padding: '2rem 1.5rem',
          boxShadow: '-10px 0 40px rgba(0,255,255,0.5)',
          overflowY: 'auto',
          zIndex: 10,
        }}>
          {recentBlocks.slice(0, 30).map((b, i) => (
            <div key={b.hash} style={{
              padding: '0.9rem 0',
              borderBottom: i < 29 ? '1px dashed #033' : 'none',
              color: i === 0 ? '#0f0' : '#0ff',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: i === 0 ? 'bold' : 'normal' }}>#{b.height}</span>
              <span>{b.tx_count || 0} tx</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
