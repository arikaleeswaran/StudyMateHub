import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaRocket, FaLightbulb, FaFire } from 'react-icons/fa';
import Navbar from '../components/Navbar'; 

function HomePage() {
  const [topic, setTopic] = useState('');
  const [isPanicMode, setIsPanicMode] = useState(false); // 🆕 Vibe State
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      // 🆕 Pass mode as a query parameter
      const mode = isPanicMode ? 'panic' : 'standard';
      navigate(`/roadmap/${topic}?mode=${mode}`);
    }
  };

  const handleQuickClick = (tag) => {
    navigate(`/roadmap/${tag}?mode=standard`);
  };

  return (
    <div style={styles.container}>
      
      <div style={{position: 'absolute', top: 0, width: '100%', zIndex: 10}}>
        <Navbar />
      </div>

      <div style={styles.heroContent}>
        
        <div style={styles.badge}>
            <FaRocket color="#ffc107" /> 
            <span>AI-Powered Learning</span>
        </div>

        <h1 style={styles.title}>
          Master Any Skill with <br/>
          <span style={styles.gradientText}>Intelligent Roadmaps</span>
        </h1>
        
        <p style={styles.subtitle}>
          Generate personalized learning paths, quizzes, and curated resources for any topic in seconds.
        </p>
        
        {/* --- SEARCH BAR --- */}
        <form onSubmit={handleSearch} style={styles.searchWrapper}>
          <FaSearch style={styles.searchIcon} />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to learn today?"
            style={styles.input}
          />
          <button type="submit" style={styles.searchButton}>
            Generate
          </button>
        </form>

        {/* --- 🆕 VIBE CHECK SWITCH --- */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ color: isPanicMode ? '#64748b' : '#00d2ff', fontWeight: 'bold' }}>🌱 Just Curious</span>
            
            <div 
                onClick={() => setIsPanicMode(!isPanicMode)}
                style={{
                    width: '50px', height: '26px', background: isPanicMode ? '#dc3545' : '#1e293b',
                    borderRadius: '20px', border: '1px solid #555', cursor: 'pointer', position: 'relative', transition: 'all 0.3s'
                }}
            >
                <div style={{
                    width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                    position: 'absolute', top: '2px', left: isPanicMode ? '26px' : '2px', transition: 'all 0.3s',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                }} />
            </div>

            <span style={{ color: isPanicMode ? '#dc3545' : '#64748b', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'5px' }}>
                <FaFire /> Exam Panic!
            </span>
        </div>

        {/* --- TRENDING TAGS --- */}
        <div style={styles.tagsContainer}>
            <span style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px' }}>Trending:</span>
            <div style={styles.tagsWrapper}>
                {['Machine Learning', 'React JS', 'System Design', 'Cybersecurity'].map((tag, i) => (
                    <button key={i} onClick={() => handleQuickClick(tag)} style={styles.tag}>
                        {tag}
                    </button>
                ))}
            </div>
        </div>

      </div>

      <div style={styles.footerInfo}>
          <p><FaLightbulb color="#ffeb3b"/> Powered by StudyMateHub</p>
      </div>

    </div>
  );
}

// ... (Keep existing styles) ...
// Add styles if you changed them, otherwise reuse the previous styles object.
const styles = {
  container: {
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #1e293b, #0f172a)', // Deep Slate Gradient
    color: 'white',
    fontFamily: '"Segoe UI", sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '800px',
    padding: '20px',
    zIndex: 2,
    marginTop: '60px', // Spacing for Navbar
    animation: 'fadeIn 1s ease-out'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 193, 7, 0.15)',
    border: '1px solid rgba(255, 193, 7, 0.3)',
    color: '#ffc107',
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: '800',
    margin: '0 0 20px 0',
    lineHeight: '1.2'
  },
  gradientText: {
    background: 'linear-gradient(90deg, #00c6ff, #0072ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#94a3b8',
    marginBottom: '40px',
    lineHeight: '1.6'
  },
  searchWrapper: {
    position: 'relative',
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50px',
    padding: '8px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.2)'
  },
  searchIcon: {
    marginLeft: '20px',
    color: '#64748b',
    fontSize: '1.2rem'
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '15px',
    color: 'white',
    fontSize: '1.1rem',
    outline: 'none',
    minWidth: '0'
  },
  searchButton: {
    background: 'linear-gradient(90deg, #00c6ff, #0072ff)',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '30px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 15px rgba(0, 114, 255, 0.3)'
  },
  tagsContainer: {
    marginTop: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  },
  tagsWrapper: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  tag: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    padding: '8px 15px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background 0.2s'
  },
  footerInfo: {
    position: 'absolute',
    bottom: '20px',
    color: '#475569',
    fontSize: '0.9rem'
  }
};

export default HomePage;