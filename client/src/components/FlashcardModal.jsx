import { useState } from 'react';
import { FaTimes, FaRedo, FaCheck, FaBrain } from 'react-icons/fa';
import useMobile from '../hooks/useMobile';

function FlashcardModal({ cards, onClose, onReviewUpdate }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const isMobile = useMobile();

  const currentCard = cards[currentIndex];

  const handleRate = async (quality) => {
    // 1. Update Backend
    await onReviewUpdate(currentCard.id, quality, currentCard.interval_days);
    
    // 2. Move to next
    setIsFlipped(false);
    if (currentIndex + 1 < cards.length) {
        setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
        setCompleted(true);
    }
  };

  if (completed) {
    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000
        }}>
            <div style={{...styles.card, width: isMobile ? '90%' : '400px'}}>
                <FaBrain size={50} color="#28a745" />
                <h2 style={{color:'black'}}>All Caught Up! 🎉</h2>
                <p style={{color:'#666'}}>You've reviewed all your due flashcards.</p>
                <button onClick={onClose} style={styles.closeBtn}>Close</button>
            </div>
        </div>
    );
  }

  return (
    <div className="modal-overlay" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000
    }}>
      <div style={{...styles.container, width: isMobile ? '90%' : '500px'}}>
        
        {/* Header */}
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', color:'white'}}>
            <span>🧠 Reviewing: {currentCard.topic}</span>
            <button onClick={onClose} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}><FaTimes size={20}/></button>
        </div>

        {/* Card */}
        <div 
            onClick={() => setIsFlipped(!isFlipped)} 
            style={{
                height: '300px', perspective: '1000px', cursor: 'pointer', marginBottom: '30px'
            }}
        >
            <div style={{
                position: 'relative', width: '100%', height: '100%', transition: 'transform 0.6s',
                transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}>
                {/* Front */}
                <div style={{...styles.face, background: 'linear-gradient(135deg, #1e293b, #0f172a)'}}>
                    <span style={{fontSize:'0.9rem', color:'#00d2ff', position:'absolute', top:'20px'}}>FRONT</span>
                    <h2 style={{fontSize:'1.8rem', textAlign:'center', padding:'20px', color:'white'}}>{currentCard.front}</h2>
                    <span style={{fontSize:'0.8rem', color:'#aaa', position:'absolute', bottom:'20px'}}>Tap to Flip</span>
                </div>

                {/* Back */}
                <div style={{...styles.face, background: '#fff', color:'#333', transform: 'rotateY(180deg)'}}>
                    <span style={{fontSize:'0.9rem', color:'#555', position:'absolute', top:'20px'}}>BACK</span>
                    <p style={{fontSize:'1.3rem', textAlign:'center', padding:'20px', lineHeight:'1.6'}}>{currentCard.back}</p>
                </div>
            </div>
        </div>

        {/* Controls */}
        {isFlipped ? (
            <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                <button onClick={(e) => { e.stopPropagation(); handleRate('hard'); }} style={{...styles.btn, background:'#dc3545'}}>Hard (1d)</button>
                <button onClick={(e) => { e.stopPropagation(); handleRate('medium'); }} style={{...styles.btn, background:'#ffc107', color:'#000'}}>Good (Wait)</button>
                <button onClick={(e) => { e.stopPropagation(); handleRate('easy'); }} style={{...styles.btn, background:'#28a745'}}>Easy (Later)</button>
            </div>
        ) : (
            <button onClick={() => setIsFlipped(true)} style={{...styles.btn, width:'100%', background:'#007bff'}}>Show Answer</button>
        )}
        
        <div style={{textAlign:'center', marginTop:'20px', color:'#aaa'}}>{currentIndex + 1} / {cards.length}</div>
      </div>
    </div>
  );
}

const styles = {
    container: { background: 'none', display: 'flex', flexDirection: 'column' },
    card: { background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center' },
    face: { 
        position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', 
        borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)'
    },
    btn: { padding: '15px 20px', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', flex: 1 },
    closeBtn: { marginTop: '20px', padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }
};

export default FlashcardModal;