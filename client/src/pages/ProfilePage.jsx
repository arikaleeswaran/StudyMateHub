import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
  const { user, signOut } = useAuth();
  const [roadmaps, setRoadmaps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchSavedRoadmaps();
  }, [user]);

  const fetchSavedRoadmaps = async () => {
    try {
      const { data, error } = await supabase
        .table('user_roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRoadmaps(data);
    } catch (error) {
      console.error("Error fetching roadmaps:", error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
            <h1 style={{ margin: 0 }}>My Profile</h1>
            <p style={{ color: '#666' }}>{user?.email}</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Logout
        </button>
      </div>

      <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Saved Roadmaps</h2>
      
      {roadmaps.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>No saved roadmaps yet. Go generate one!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {roadmaps.map((map) => (
                <div 
                    key={map.id} 
                    onClick={() => navigate(`/roadmap/${map.topic}`)}
                    style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <h3 style={{ margin: '0 0 10px 0', textTransform: 'capitalize' }}>{map.topic}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#999' }}>Created: {new Date(map.created_at).toLocaleDateString()}</p>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default ProfilePage;