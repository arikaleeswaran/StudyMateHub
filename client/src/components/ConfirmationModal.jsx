import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import useMobile from '../hooks/useMobile'; // ✅ Import Hook

function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  
  const isMobile = useMobile(); // ✅ Use Hook

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      backdropFilter: 'blur(3px)',
      padding: '20px' // Prevent touching edges
    }}>
      <div style={{
        background: 'white', 
        padding: isMobile ? '20px' : '30px', 
        borderRadius: '15px', 
        maxWidth: '400px', 
        width: '100%',
        textAlign: 'center', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', 
        animation: 'popIn 0.2s ease-out'
      }}>
        
        <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', color: '#dc3545', marginBottom: '15px' }}>
            <FaExclamationTriangle />
        </div>
        
        <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>{title}</h2>
        
        <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.5', fontSize: isMobile ? '0.9rem' : '1rem' }}>
            {message}
        </p>
        
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={onCancel} style={{
                padding: '12px 25px', border: '1px solid #ddd', background: 'white', color: '#555',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s',
                width: isMobile ? '100%' : 'auto'
            }}>
                Cancel
            </button>
            
            <button onClick={onConfirm} style={{
                padding: '12px 25px', border: 'none', background: '#dc3545', color: 'white',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                boxShadow: '0 4px 10px rgba(220, 53, 69, 0.3)', transition: 'all 0.2s',
                width: isMobile ? '100%' : 'auto'
            }}>
                Yes, Delete
            </button>
        </div>

      </div>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ConfirmationModal;