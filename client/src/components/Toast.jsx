import React, { useEffect } from 'react';
import { FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-hide after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      top: '90px', // Below the Navbar
      right: '20px',
      background: isSuccess ? 'rgba(40, 167, 69, 0.95)' : 'rgba(0, 123, 255, 0.95)',
      color: 'white',
      padding: '15px 25px',
      borderRadius: '10px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out',
      backdropFilter: 'blur(5px)',
      minWidth: '250px'
    }}>
      {isSuccess ? <FaCheckCircle size={20} /> : <FaInfoCircle size={20} />}
      <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{message}</span>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default Toast;