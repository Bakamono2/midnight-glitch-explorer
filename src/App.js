      {/* TIMELINE — slim, perfect, with correct arrow logic */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: isTimelineOpen ? '2vw' : '-360px',
        transform: 'translateY(-50%)',
        width: '340px',
        height: '76vh',
        maxHeight: '76vh',
        background: 'rgba(0,10,30,0.96)',
        borderRadius: '16px',
        border: '2px solid #0ff',
        boxShadow: '0 0 40px rgba(0,255,255,0.5)',
        transition: 'right 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        paddingLeft: '32px'   // makes space for the outside button
      }}>
        {/* Button is now child of this div, but positioned outside */}
        <button
          onClick={() => setIsTimelineOpen(p => !p)}
          style={{
            position: 'absolute',
            top: '50%',
            left: '-32px',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '48px',
            background: 'rgba(0, 255, 255, 0.35)',
            border: '2px solid #0ff',
            borderRadius: '16px 0 0 16px',
            color: '#0ff',
            cursor: 'pointer',
            boxShadow: '-8px 0 30px rgba(0,255,255,0.9)',
            transition: 'all 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 101,
            outline: 'none',
            backdropFilter: 'blur(10px)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            {isTimelineOpen ? (
              <path d="M15 18l-6-6 6-6" />  {/* ← inward = close */}
            ) : (
              <path d="M9 18l6-6-6-6" />    {/* → outward = open */}
            )}
          </svg>
        </button>

        {/* Timeline content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', height: '100%', scrollbarWidth: 'none' }}>
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
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
