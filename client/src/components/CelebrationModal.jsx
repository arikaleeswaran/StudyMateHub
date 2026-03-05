import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import useMobile from '../hooks/useMobile';

function CelebrationModal({ isOpen, title, subtitle, onClose, type = 'node' }) {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const isMobile = useMobile();

  useEffect(() => {
    if (isOpen) {
      // 🎵 Play Success Chime Sound
      // We use a free, reliable CDN link for a quick success ding
      const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3');
      audio.volume = 0.6; // Not too loud
      audio.play().catch(err => console.log("Audio autoplay blocked by browser (user must interact first)", err));

      // Keep confetti sized correctly if window changes
      const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
        backdropFilter: 'blur(5px)'
    }}>
        {/* 🎊 The Confetti Engine */}
        <Confetti 
            width={dimensions.width} 
            height={dimensions.height} 
            // If they finish the whole course, it rains forever. If just a node, it bursts once.
            recycle={type === 'course'} 
            numberOfPieces={type === 'course' ? 500 : 250}
            gravity={type === 'course' ? 0.15 : 0.4}
            style={{ zIndex: 10000 }}
        />
        
        {/* The Pop-up Card */}
        <div style={{
            background: 'var(--card-bg)', color: 'var(--text-main)', padding: isMobile ? '30px 20px' : '40px',
            borderRadius: '20px', border: '2px solid var(--accent-green)', textAlign: 'center',
            boxShadow: '0 0 50px rgba(40, 167, 69, 0.4)', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            maxWidth: '400px', width: '90%', position: 'relative', zIndex: 10001
        }}>
            <div style={{ fontSize: '4rem', marginBottom: '10px', animation: 'bounce 2s infinite' }}>
                {type === 'course' ? '🏆' : '🌟'}
            </div>
            
            <h1 style={{ margin: '0 0 10px 0', color: 'var(--accent-green)', fontSize: isMobile ? '1.5rem' : '2rem' }}>
                {title}
            </h1>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '25px', lineHeight: '1.5' }}>
                {subtitle}
            </p>
            
            <button onClick={onClose} style={{
                padding: '12px 30px', background: 'var(--accent-green)', color: 'white',
                border: 'none', borderRadius: '30px', fontSize: '1.1rem', fontWeight: 'bold',
                cursor: 'pointer', boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)', transition: 'transform 0.2s',
                width: '100%'
            }}>
                Continue Learning 🚀
            </button>
        </div>
        
        <style>{`
            @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        `}</style>
    </div>
  );
}

export default CelebrationModal;