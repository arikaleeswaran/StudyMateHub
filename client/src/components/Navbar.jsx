import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav style={navStyle}>
      {/* Logo / Home Link */}
      <Link to="/" style={logoStyle}>
        🧠 StudyMateHub
      </Link>

      {/* Auth Buttons */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {user ? (
          <>
            <span style={{ color: '#666', fontSize: '0.9rem' }}>
              Hello, {user.user_metadata.full_name || user.email.split('@')[0]}
            </span>
            <Link to="/profile" style={linkStyle}>My Profile</Link>
            <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
          </>
        ) : (
          <Link to="/auth" style={loginBtnStyle}>Login / Sign Up</Link>
        )}
      </div>
    </nav>
  );
}

// Styles
const navStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '15px 40px', background: 'white', borderBottom: '1px solid #eee',
  position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
};

const logoStyle = {
  fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: '#333'
};

const linkStyle = {
  textDecoration: 'none', color: '#333', fontWeight: '600'
};

const loginBtnStyle = {
  padding: '10px 20px', background: '#007bff', color: 'white',
  borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold', transition: '0.2s'
};

const logoutBtnStyle = {
  padding: '8px 15px', background: '#dc3545', color: 'white',
  border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
};

export default Navbar;