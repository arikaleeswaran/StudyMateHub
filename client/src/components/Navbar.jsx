import { useNavigate } from 'react-router-dom';
import { FaBrain, FaUserCircle, FaSignOutAlt,FaTrophy,FaUserShield } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.logo} onClick={() => navigate('/')}>
          <FaBrain style={{ color: '#00d2ff', fontSize: '1.5rem' }} />
          <span style={styles.logoText}>StudyMateHub</span>
      </div>
      
      <div style={{display:'flex', gap:'15px', alignItems: 'center'}}>
        {user ? (
            <>
                <button onClick={() => navigate('/admin')} style={styles.navButton} title="Admin Panel">
                  <FaUserShield size={18} color="#ff4444" />
              </button>
                <button onClick={() => navigate('/profile')} style={styles.navButton}>
                    <FaUserCircle size={18} /> Dashboard
                </button>
                <button onClick={() => navigate('/leaderboard')} style={styles.navButton}>
                    <FaTrophy size={18} color="#FFD700" /> Leaderboard
                </button>
                <button onClick={handleLogout} style={{...styles.navButton, background:'rgba(220, 53, 69, 0.2)', borderColor:'rgba(220, 53, 69, 0.3)', color: '#ff6b6b'}}>
                    <FaSignOutAlt />
                </button>
            </>
        ) : (
            <button onClick={() => navigate('/auth')} style={styles.navButton}>
                Login
            </button>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    width: '100%',
    padding: '15px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#1e293b', // Matches the Homepage Dark Theme
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    boxSizing: 'border-box'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  logoText: {
    fontWeight: 'bold', 
    fontSize: '1.2rem', 
    background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent'
  },
  navButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '8px 15px',
    borderRadius: '20px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    fontSize: '0.9rem'
  }
};

export default Navbar;