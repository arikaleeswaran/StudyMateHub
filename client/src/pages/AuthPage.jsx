import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar'; 
import useMobile from '../hooks/useMobile';

function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isMobile = useMobile();

  // --- NEW SYNC FUNCTION ---
  const syncGuestData = async (userId) => {
    const guestDataRaw = localStorage.getItem('guest_data');
    if (!guestDataRaw) return; 

    const guestData = JSON.parse(guestDataRaw);
    if (!guestData.roadmap && guestData.progress.length === 0 && guestData.resources.length === 0) return;

    try {
        setMessage("Syncing your guest progress... ⏳");
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        
        await axios.post(`${baseUrl}/api/sync_guest_data`, {
            user_id: userId,
            guest_data: guestData
        });
        
        localStorage.removeItem('guest_data');
        setMessage("✅ Progress Merged Successfully!");
    } catch (err) {
        console.error("Sync failed", err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!isSignUp && email.toLowerCase() === 'admin@studymate.com') {
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

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user) userId = data.user.id;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        userId = data.user.id;
      }

      // ✅ Trigger Sync
      if (userId) {
          await syncGuestData(userId);
          setTimeout(() => navigate('/profile'), 1500); 
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b, #0f172a)', display: 'flex', flexDirection: 'column', color: 'white' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}><Navbar /></div>
      
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: isMobile ? '30px' : '40px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '400px', width: '100%', backdropFilter: 'blur(10px)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
             {isSignUp ? "Join the Hub 🚀" : "Welcome Back 👋"}
          </h2>
          
          {error && <div style={{ background: 'rgba(220, 53, 69, 0.2)', color: '#ff6b6b', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
          {message && <div style={{ background: 'rgba(40, 167, 69, 0.2)', color: '#28a745', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>{message}</div>}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {isSignUp && (
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
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={styles.input}
            />
            
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={styles.input}
            />
            
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#aaa' }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <span 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }} 
              style={{ color: '#00d2ff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  input: { padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', fontSize: '1rem' },
  button: { padding: '12px', borderRadius: '8px', border: 'none', background: '#007bff', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' }
};

export default AuthPage;