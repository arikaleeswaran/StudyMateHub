import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // ✅ Import Theme Hook
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaTrophy, FaUserShield, FaHome, FaShieldAlt, FaSun, FaMoon } from 'react-icons/fa'; // ✅ Added Sun/Moon
import useMobile from '../hooks/useMobile';

function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme(); // ✅ Get theme state
  const navigate = useNavigate();
  const isMobile = useMobile();

  return (
    <div style={{
        ...styles.nav,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '15px' : '0',
        padding: isMobile ? '15px' : '15px 30px'
    }}>
      <div onClick={() => navigate('/')} style={styles.logo}>StudyMateHub</div>
      
      <div style={{
          ...styles.links,
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: isMobile ? '10px' : '20px'
      }}>
        
        {/* ✅ Theme Toggle Button (Visible to everyone) */}
        <button onClick={toggleTheme} style={styles.navButton} title="Toggle Theme">
          {theme === 'dark' ? <FaSun size={20} color="#FFD700" /> : <FaMoon size={20} color="#64748b" />}
        </button>

        {user ? (
          <>
            <button onClick={() => navigate('/')} style={styles.navButton}><FaHome size={18} color="var(--accent-green)" /> {isMobile ? '' : 'Home'}</button>
            <button onClick={() => navigate('/squads')} style={styles.navButton}><FaShieldAlt size={18} color="var(--accent-blue)" /> {isMobile ? '' : 'Squads'}</button>
            <button onClick={() => navigate('/leaderboard')} style={styles.navButton}><FaTrophy size={18} color="#FFD700" /> {isMobile ? '' : 'Leaderboard'}</button>
            <button onClick={() => navigate('/profile')} style={styles.navButton}><FaUserCircle size={18} /> {isMobile ? '' : 'Dashboard'}</button>
            <button onClick={() => navigate('/admin/login')} style={styles.navButton} title="Admin Panel"><FaUserShield size={18} color="var(--accent-red)" /></button>
            <button onClick={() => signOut()} style={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <button onClick={() => navigate('/auth')} style={styles.loginBtn}>Login</button>
        )}
      </div>
    </div>
  );
}

// ✅ UPDATED: Replaced hardcoded dark colors with CSS variables
const styles = {
  nav: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    background: 'var(--nav-bg)', 
    backdropFilter: 'blur(10px)', 
    color: 'var(--text-main)', 
    borderBottom: '1px solid var(--card-border)',
    transition: 'background 0.3s ease, color 0.3s ease'
  },
  logo: { 
    fontSize: '1.5rem', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    background: 'linear-gradient(90deg, #00c6ff, #0072ff)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent' 
  },
  links: { display: 'flex', alignItems: 'center' },
  navButton: { 
    background: 'none', 
    border: 'none', 
    color: 'var(--text-main)', 
    cursor: 'pointer', 
    fontSize: '1rem', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px',
    transition: 'color 0.3s ease'
  },
  loginBtn: { 
    padding: '8px 20px', 
    borderRadius: '20px', 
    border: 'none', 
    background: 'var(--accent-blue)', 
    color: 'white', 
    cursor: 'pointer', 
    fontWeight: 'bold' 
  },
  logoutBtn: { 
    background: 'none', 
    border: '1px solid var(--accent-red)', 
    color: 'var(--accent-red)', 
    padding: '5px 15px', 
    borderRadius: '15px', 
    cursor: 'pointer' 
  }
};

export default Navbar;