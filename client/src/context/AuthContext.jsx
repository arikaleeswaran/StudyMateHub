import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error("Supabase Auth Error:", error);
            await supabase.auth.signOut(); 
            if (isMounted) setUser(null);
        } else {
            if (isMounted) setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error("Critical Auth Network Failure:", err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false); 
      }
    };
    
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUser(session?.user ?? null);
    });

    return () => {
        isMounted = false;
        subscription.unsubscribe();
    }
  }, []);

  const value = {
    user,
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signUp: (data) => supabase.auth.signUp(data),
    
    
    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn("Supabase signout notice:", error.message);
      } finally {
        setUser(null); // This absolutely guarantees the UI logs them out
      }
    },
  };

  if (loading) {

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: 'var(--bg-solid)' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--card-border)', borderTop: '4px solid var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);