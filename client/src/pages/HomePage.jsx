import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaRocket, FaLightbulb, FaFire } from 'react-icons/fa';
import Navbar from '../components/Navbar'; 
import useMobile from '../hooks/useMobile';

function HomePage() {
  const [topic, setTopic] = useState('');
  const [isPanicMode, setIsPanicMode] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMobile();

  const handleSearch = (e) => {
    e.preventDefault();
    if (topic.trim()) {
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

      <div style={{
          ...styles.heroContent,
          marginTop: isMobile ? '140px' : '60px', 
          padding: isMobile ? '20px' : '20px'
      }}>
        
        <div style={styles.badge}>
            <FaRocket color="#ffc107" /> 
            <span>AI-Powered Learning</span>
        </div>

        <h1 style={{
            ...styles.title,
            fontSize: isMobile ? '2.5rem' : '3.5rem' 
        }}>
          Master Any Skill with <br/>
          <span style={styles.gradientText}>Intelligent Roadmaps</span>
        </h1>
        
        <p style={{
            ...styles.subtitle,
            fontSize: isMobile ? '1rem' : '1.2rem'
        }}>
          Generate personalized learning paths, quizzes, and curated resources for any topic in seconds.
        </p>
        
        {/* --- SEARCH BAR --- */}
        <form onSubmit={handleSearch} style={{
            ...styles.searchWrapper,
            flexDirection: 'row', 
        }}>
          <FaSearch style={styles.searchIcon} />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={isMobile ? "Topic (e.g., Python)" : "What do you want to learn today?"}
            style={styles.input}
          />
          <button type="submit" style={{
              ...styles.searchButton,
              padding: isMobile ? '12px 20px' : '15px 30px'
          }}>
            Generate
          </button>
        </form>

        {/* VIBE CHECK SWITCH --- */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ color: isPanicMode ? 'var(--text-muted)' : 'var(--accent-blue)', fontWeight: 'bold', fontSize: isMobile ? '0.9rem' : '1rem' }}>🌱 Just Curious</span>
            
            <div 
                onClick={() => setIsPanicMode(!isPanicMode)}
                style={{
                    width: '50px', height: '26px', background: isPanicMode ? 'var(--accent-red)' : 'var(--card-bg)',
                    borderRadius: '20px', border: '1px solid var(--card-border)', cursor: 'pointer', position: 'relative', transition: 'all 0.3s'
                }}
            >
                <div style={{
                    width: '20px', height: '20px', background: 'var(--text-main)', borderRadius: '50%',
                    position: 'absolute', top: '2px', left: isPanicMode ? '26px' : '2px', transition: 'all 0.3s',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                }} />
            </div>

            <span style={{ color: isPanicMode ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'5px', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                <FaFire /> Exam Panic!
            </span>
        </div>

        {/* --- TRENDING TAGS --- */}
        <div style={styles.tagsContainer}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>Trending:</span>
            <div style={styles.tagsWrapper}>
                {['Machine Learning', 'React JS', 'System Design', 'Cybersecurity'].map((tag, i) => (
                    <button key={i} onClick={() => handleQuickClick(tag)} style={styles.tag}>
                        {tag}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--text-main)', fontFamily: '"Segoe UI", sans-serif', position: 'relative', overflow: 'hidden' },
  heroContent: { textAlign: 'center', maxWidth: '800px', zIndex: 2, animation: 'fadeIn 1s ease-out', width: '100%' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 193, 7, 0.15)', border: '1px solid rgba(255, 193, 7, 0.3)', color: '#ffc107', padding: '5px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '20px' },
  title: { fontWeight: '800', margin: '0 0 20px 0', lineHeight: '1.2' },
  gradientText: { background: 'linear-gradient(90deg, #00c6ff, #0072ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', },
  subtitle: { color: 'var(--text-muted)', marginBottom: '40px', lineHeight: '1.6' },
  searchWrapper: { position: 'relative', maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '50px', padding: '8px', backdropFilter: 'blur(10px)', boxShadow: '0 4px 25px rgba(0, 0, 0, 0.1)' },
  searchIcon: { marginLeft: '20px', color: 'var(--text-muted)', fontSize: '1.2rem' },
  input: { flex: 1, background: 'transparent', border: 'none', padding: '15px', color: 'var(--text-main)', fontSize: '1.1rem', outline: 'none', minWidth: '0' },
  searchButton: { background: 'linear-gradient(90deg, #00c6ff, #0072ff)', border: 'none', borderRadius: '30px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(0, 114, 255, 0.3)' },
  tagsContainer: { marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  tagsWrapper: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' },
  tag: { background: 'var(--card-hover)', border: '1px solid var(--card-border)', color: 'var(--text-main)', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s' },
};

export default HomePage;