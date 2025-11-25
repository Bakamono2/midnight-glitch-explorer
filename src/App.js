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
  const [loading, setLoading] = useState(true);

  const addParticle = (count) => {
    for (let i = 0; i < Math.min(count * 4, 30); i++) {
      setTimeout(() => {
        setParticles(p => [...p, { id: Date.now() + Math.random(), left: Math.random() * 100 }].slice(-120));
      }, i * 80);
    }
  };

  const spawnShieldedFloat = () => {
    const id = Date.now() + Math.random();
    const left = 10 + Math.random() * 80;
    setShieldedFloats(prev => [...prev, { id, left }].slice(-12));
  };

  // REAL EPOCH SHIELDED COUNTER — counts every single shielded tx in current epoch
  const fetchEpochShielded = async () => {
    try {
      const epochRes = await fetch(`${BASE_URL}/epochs/latest`, { headers: { project_id: API_KEY }});
      const epoch = await epochRes.json();
      setCurrentEpoch(epoch.epoch);

      // Get all blocks in current epoch (paginated)
      let allTxs = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const blocksRes = await fetch(
          `${BASE_URL}/epochs/${epoch.epoch}/blocks?page=${page}&count=100`,
          { headers: { project_id: API_KEY }}
        );
        const blocks = await blocksRes.json();
        if (blocks.length === 0) break;

        allTxs += blocks.reduce((sum, b) => sum + (b.tx_count || 0), 0);
        page++;
        if (blocks.length < 100) hasMore = false;
      }

      setEpochShielded(allTxs);
    } catch (e) {
      console.error("Epoch fetch failed:", e);
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

        if (txCount > 10) {
          confetti({ particleCount: 400, spread: 180, origin: { y: 0.25 }, colors: ['#ffd700', '#ff00ff', '#00ffff', '#39ff14'] });
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6500);
    return () => clearInterval(interval);
  }, [latest]);

  useEffect(() => {
    fetchEpochShielded();
    const epochInterval = setInterval(fetchEpochShielded, 300000); // every 5 mins
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
              <span><strong>{epochShielded}</strong> Shielded This Epoch</span>
              <span>Epoch <strong>{currentEpoch}</strong></span>
              <span><strong>{recentBlocks.length}</strong> Recent Blocks</span>
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
              <span className="txs">{b.tx_count || 0} tx</span
