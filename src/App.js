      {/* Main Card — pulled higher up */}
      <div style={{
        position: 'absolute',
        top: '42%',                         // ← moved way up
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

      {/* DASHBOARD — now safely below with huge gap */}
      <div style={{
        position: 'absolute',
        top: '64%',                         // ← huge gap, impossible to overlap
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 90vw)',
        padding: '1.4rem 2rem',
        background: 'rgba(0,20,40,0.95)',
        border: '2px solid #0ff',
        borderRadius: '16px',
        boxShadow: '0 0 35px #0ff',
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: 'clamp(1.3rem, 2.2vw, 1.8rem)',
        zIndex: 20,
        textAlign: 'center'
      }}>
        <div>Tx/s <span style={{ color: '#0f0', fontWeight: 'bold' }}>{txPerSecond.toFixed(1)}</span></div>
        <div>Total Blocks <span style={{ color: '#0f0', fontWeight: 'bold' }}>{latest?.height || '-'}</span></div>
        <div>Epoch Ends In <span style={{ color: '#ff0', fontWeight: 'bold' }}>{timeLeft}</span></div>
      </div>
