import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserShield, FaLock } from 'react-icons/fa';
import useMobile from '../hooks/useMobile';

function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isMobile = useMobile();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
      const res = await axios.post(`${baseUrl}/api/admin/login`, { email, password });
      
      if (res.data.success) {
        localStorage.setItem('admin_auth', 'true');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError('❌ Access Denied: Invalid Credentials');
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'Segoe UI' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: isMobile ? '30px' : '40px', margin: '20px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
        <div style={{ marginBottom: '20px' }}><FaUserShield size={50} color="#00d2ff" /></div>
        <h2 style={{ marginBottom: '5px' }}>Admin Protocol</h2>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>Restricted Access Only</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={styles.inputGroup}>
            <FaUserShield color="#aaa" />
            <input type="email" placeholder="Admin ID" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
          </div>
          <div style={styles.inputGroup}>
            <FaLock color="#aaa" />
            <input type="password" placeholder="Passcode" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
          </div>
          {error && <p style={{ color: '#ff4444', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" style={styles.button}>Authenticate</button>
        </form>
        
        <button onClick={() => navigate('/')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>← Return to Student Portal</button>
      </div>
    </div>
  );
}

const styles = {
  inputGroup: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' },
  input: { background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '1rem' },
  button: { padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' }
};

export default AdminLoginPage;