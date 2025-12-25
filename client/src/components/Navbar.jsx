import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaTrophy, FaUserShield } from 'react-icons/fa';
import useMobile from '../hooks/useMobile';

function Navbar() {
  const { user, signOut } = useAuth();
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
        {user ? (
          <>
            <button onClick={() => navigate('/leaderboard')} style={styles.navButton}><FaTrophy size={18} color="#FFD700" /> {isMobile ? '' : 'Leaderboard'}</button>
            <button onClick={() => navigate('/profile')} style={styles.navButton}><FaUserCircle size={18} /> {isMobile ? '' : 'Dashboard'}</button>
            <button onClick={() => navigate('/admin/login')} style={styles.navButton} title="Admin Panel"><FaUserShield size={18} color="#ff4444" /></button>
            <button onClick={() => signOut()} style={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <button onClick={() => navigate('/auth')} style={styles.loginBtn}>Login</button>
        )}
      </div>
    </div>
  );
}

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  logo: { fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', background: 'linear-gradient(90deg, #00c6ff, #0072ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  links: { display: 'flex', alignItems: 'center' },
  navButton: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' },
  loginBtn: { padding: '8px 20px', borderRadius: '20px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
  logoutBtn: { background: 'none', border: '1px solid #dc3545', color: '#dc3545', padding: '5px 15px', borderRadius: '15px', cursor: 'pointer' }
};

export default Navbar;