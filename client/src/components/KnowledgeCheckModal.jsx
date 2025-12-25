import React from 'react';
import useMobile from '../hooks/useMobile'; // ✅ Import Hook

function KnowledgeCheckModal({ nodeLabel, onYes, onNo }) {
  const isMobile = useMobile();

  return (
    <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', 
        zIndex: 1000, backdropFilter: 'blur(5px)', padding: '20px'
    }}>
      <div style={{
          background: 'white',
          padding: isMobile ? '25px' : '40px',
          borderRadius: '20px',
          maxWidth: '450px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', marginBottom: '15px' }}>🤔</div>
        
        <h2 style={{ margin: '0 0 15px 0', color: '#333', fontSize: isMobile ? '1.5rem' : '2rem' }}>Quick Check</h2>
        
        <p style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: '#555', marginBottom: '30px', lineHeight: '1.6' }}>
          Have you studied <strong style={{color: '#007bff'}}>{nodeLabel}</strong> before?
        </p>
        
        <div style={{ display: 'flex', gap: '15px', flexDirection: isMobile ? 'column' : 'row' }}>
          <button onClick={onYes} style={{
              flex: 1, padding: '15px', border: 'none', borderRadius: '10px',
              background: '#28a745', color: 'white', fontSize: '1rem', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)', transition: 'transform 0.2s'
          }}>
            Yes, I know it
          </button>
          <button onClick={onNo} style={{
              flex: 1, padding: '15px', border: 'none', borderRadius: '10px',
              background: '#007bff', color: 'white', fontSize: '1rem', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)', transition: 'transform 0.2s'
          }}>
            No, I'm new
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default KnowledgeCheckModal;