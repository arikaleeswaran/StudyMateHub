import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar'; 
import useMobile from '../hooks/useMobile';
import { FaUserShield } from 'react-icons/fa';

function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false); 
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isMobile = useMobile();

  // --- SYNC FUNCTION ---
  const syncUserData = async (userId, nameToSave) => {
    const guestDataRaw = localStorage.getItem('guest_data');
    const guestData = guestDataRaw ? JSON.parse(guestDataRaw) : {};

    try {
        setMessage("Setting up your dashboard... ⏳");
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        
        await axios.post(`${baseUrl}/api/sync_guest_data`, {
            user_id: userId,
            full_name: nameToSave,
            guest_data: guestData
        });
        
        if (guestDataRaw) {
            localStorage.removeItem('guest_data');
        }
        setMessage("✅ Ready!");
    } catch (err) {
        console.error("Sync failed", err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    
    if (isAdminMode) {
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
            const res = await axios.post(`${baseUrl}/api/admin/login`, { email, password });
            
            if (res.data.success) {
                localStorage.setItem('admin_auth', 'true'); 
                navigate('/admin/dashboard'); 
                return; 
            }
        } catch (err) {
            setError('❌ Invalid Admin Credentials');
            setLoading(false);
            return;
        }
    }

    try {
      let userId = null;
      let nameToSave = fullName;

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user) userId = data.user.id;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        userId = data.user.id;
        nameToSave = data.user.user_metadata?.full_name || email.split('@')[0];
      }

      if (userId) {
          await syncUserData(userId, nameToSave);
          setTimeout(() => navigate('/profile'), 1000); 
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column', color: 'var(--text-main)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}><Navbar /></div>
      
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ background: 'var(--card-bg)', padding: isMobile ? '30px' : '40px', borderRadius: '15px', border: '1px solid var(--card-border)', maxWidth: '400px', width: '100%', backdropFilter: 'blur(10px)' }}>
          
          <h2 style={{ textAlign: 'center', marginBottom: '20px', color: isAdminMode ? 'var(--accent-red)' : 'var(--text-main)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
             {isAdminMode ? <><FaUserShield /> Admin Access</> : (isSignUp ? "Join the Hub 🚀" : "Welcome Back 👋")}
          </h2>
          
          {error && <div style={{ background: 'rgba(220, 53, 69, 0.1)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
          {message && <div style={{ background: 'rgba(40, 167, 69, 0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>{message}</div>}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {isSignUp && !isAdminMode && (
              <input 
                type="text" 
                placeholder="Full Name" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                style={styles.input}
              />
            )}
            
            <input 
              type="email" 
              placeholder={isAdminMode ? "Admin Email" : "Email Address"} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={styles.input}
            />
            
            <input 
              type="password" 
              placeholder={isAdminMode ? "Admin Passcode" : "Password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={styles.input}
            />
            
            <button type="submit" disabled={loading} style={{...styles.button, background: isAdminMode ? 'var(--accent-red)' : 'var(--accent-blue)'}}>
              {loading ? "Processing..." : isAdminMode ? "Authenticate" : (isSignUp ? "Sign Up" : "Log In")}
            </button>
          </form>

          {/* Toggle Between Login/Signup/Admin */}
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {!isAdminMode ? (
                <>
                    <p style={{margin: '0 0 10px 0'}}>
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                        <span 
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }} 
                            style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            {isSignUp ? "Log In" : "Sign Up"}
                        </span>
                    </p>
                    <span 
                        onClick={() => { setIsAdminMode(true); setIsSignUp(false); setError(''); setMessage(''); setEmail(''); setPassword(''); }}
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.8rem' }}
                    >
                        <FaUserShield /> Admin Login
                    </span>
                </>
            ) : (
                <span 
                    onClick={() => { setIsAdminMode(false); setError(''); setMessage(''); setEmail(''); setPassword(''); }}
                    style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Return to Student Login
                </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

const styles = {
  input: { padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--card-hover)', color: 'var(--text-main)', outline: 'none', fontSize: '1rem' },
  button: { padding: '12px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px', transition: 'background 0.3s ease' }
};

export default AuthPage;