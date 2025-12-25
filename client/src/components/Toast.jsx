import React, { useEffect } from 'react';
import { FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import useMobile from '../hooks/useMobile'; // ✅ Import Hook

function Toast({ message, type = 'success', onClose }) {
  const isMobile = useMobile();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      // ✅ Mobile: Bottom Center | Desktop: Top Right
      top: isMobile ? 'auto' : '90px', 
      bottom: isMobile ? '20px' : 'auto',
      right: isMobile ? 'auto' : '20px',
      left: isMobile ? '50%' : 'auto',
      transform: isMobile ? 'translateX(-50%)' : 'none',
      width: isMobile ? '90%' : 'auto', // Responsive Width
      
      background: isSuccess ? 'rgba(40, 167, 69, 0.95)' : 'rgba(0, 123, 255, 0.95)',
      color: 'white',
      padding: '15px 25px',
      borderRadius: '10px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 2000, // Higher than everything
      animation: isMobile ? 'slideUp 0.3s ease-out' : 'slideIn 0.3s ease-out',
      backdropFilter: 'blur(5px)',
      minWidth: '250px'
    }}>
      {isSuccess ? <FaCheckCircle size={20} /> : <FaInfoCircle size={20} />}
      <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{message}</span>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default Toast;