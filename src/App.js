import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

const API_KEY = process.env.REACT_APP_BLOCKFROST_KEY;
const BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0';

function App() {
  const [latest, setLatest] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [particles, setParticles] = useState([]);
  const [shieldedFloats, setShieldedFloats] = useState([]);
  const [epochShielded, setEpochShielded] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [epochStartHeight, setEpochStartHeight] = useState(0);
  const [loading, setLoading] = useState(true);

  const addParticle = (count) => {
    for (let i = 0; i < Math.min(count * 3, 25); i++) {
      setTimeout(() => {
        setParticles(p => [...p, { id: Date.now() + Math.random(), left: Math.random() * 100 }].slice(-100));
      }, i * 100);
    }
  };

  const spawnShieldedFloat = () => {
    const id = Date.now() + Math.random();
    const left = 10 + Math.random() * 80;
    setShieldedFloats(prev => [...prev, { id, left }].slice(-10));
  };

  // Fetch epoch stats
  const fetchEpochStats = async () => {
    try {
      const epochRes = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
      const epoch = await epochRes.json();
      setCurrentEpoch(epoch.epoch);

      // Fetch blocks from epoch start to latest (limit to last 500 for rate limits)
      const startHeight = epoch.start_height || (epoch.epoch * 43200); // ~5 days * 12 blocks/hr * 24hr
      const blocksRes = await fetch(`${BASE_URL}/blocks?from=${startHeight}&order=desc&count=500`, { headers: { project_id: API_KEY }});
      const epochBlocks = await blocksRes.json();

      // Sum shielded txs (all txs are shielded on Midnight testnet, but filter for non-empty)
      const totalShielded = epochBlocks.reduce((sum, b) => sum + (b.tx_count || 0), 0);
      setEpochShielded(totalShielded);
      setEpochStartHeight(startHeight);
    } catch (e) {
      console.error("Epoch stats error:", e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/blocks/latest`, { headers: { project_id: API_KEY }});
      const block = await res.json();
      const txRes = await fetch(`${BASE_URL}/blocks/${block.hash}/txs`, { headers: { project_id: API_KEY }});
      const txs = await txRes.json();

      if (!latest || block.hash !== latest.hash) {
        const txCount = txs.length;
        setLatest(block);
        setRecentBlocks(prev => {
          const filtered = prev.filter(b => b.hash !== block.hash);
          return [block, ...filtered].slice(0, 50);
        });
        addParticle(txCount);
        if (txCount > 0) spawnShieldedFloat();

        if (txCount > 8) {
          confetti({ particleCount: 300, spread: 160, origin: { y: 0.3 }, colors: ['#ffd700', '#ff00ff', '#00ffff'] });
        }
      }
      setLoading(false);
    } catch (e) {
      console.error("Error:", e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6500);
    return () => clearInterval(interval);
  }, [latest]);

  useEffect(() => {
    fetchEpochStats();
    const epochInterval = setInterval(fetchEpochStats, 300000); // 5 mins
    return () => clearInterval(epochInterval);
  }, []);

  if (loading) return <div className="loading glitch" data-text="ENTERING THE SHADOWS...">ENTERING THE SHADOWS...</div>;

  return (
    <div className="App">
      {particles.map(p => <div key={p.id} className="rain" style={{ left: `${p.left}%` }}></div>)}
      {shieldedFloats.map(f => <div key={f.id} className="shielded-fall" style={{ left: `${f.left}%` }}>SHIELDED</div>)}

      <div className="main-layout">
        <div className="dashboard">
          <header className="header">
            <h1 className="glitch-title" data-text="MIDNIGHT">MIDNIGHT</h1>
            <p className="subtitle centered" data-text="EXPLORER">EXPLORER</p>
          </header>

          <main>
            <div className="card main-card">
              <h2 className="glitch" data-text="LATEST BLOCK">LATEST BLOCK</h2>
              <p className="block-num">#{latest?.height || '???'}</p>
              <p className="hash">Hash: {(latest?.hash || '').slice(0, 24)}...</p>
              <p className="txs">{latest ? recentBlocks[0]?.tx_count || 0 : 0} shielded transactions</p>
            </div>

            <div className="stats-bar">
              <span><strong>{((recentBlocks[0]?.height - recentBlocks[recentBlocks.length-1]?.height) / ((recentBlocks.length-1) * 6.5))?.toFixed(2) || '0.00'}</strong> TPS</span>
              <span><strong>{latest?.height || 0}</strong> Total Blocks</span>
              <span><strong>{epochShielded}</strong> Shielded This Epoch</span>
              <span>Epoch <strong>{currentEpoch}</strong></span>
              <span>Slot <strong>{latest?.slot || '-'}</strong></span>
              <span>Privacy <strong>{recentBlocks.length > 0 ? Math.round((recentBlocks.filter(b => (b.tx_count || 0) > 0).length / recentBlocks.length * 100) : 0}%</strong></span>
              <span><strong>{shieldedFloats.length}</strong> Live Events</span>
            </div>
          </main>

          <footer>
            <p><span className="glitch" data-text="shhh...">shhh...</span> nothing ever happened</p>
          </footer>
        </div>

        <div className="timeline">
          {recentBlocks.map((b, i) => (
            <div key={b.hash} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>
              <span className="height">#{b.height}</span>
              <span className="txs">{b.tx_count || 0} tx</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
