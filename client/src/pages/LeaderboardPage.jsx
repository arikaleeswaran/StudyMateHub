import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { FaTrophy, FaMedal, FaCrown } from 'react-icons/fa';
import useMobile from '../hooks/useMobile';

function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useMobile();

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const res = await axios.get(`${baseUrl}/api/leaderboard`);
        setLeaders(res.data);
      } catch (error) {
        console.error("Leaderboard error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  const getRankStyle = (index) => {
      if (index === 0) return { icon: <FaCrown size={24} color="#FFD700"/>, color: '#FFD700', bg: 'rgba(255, 215, 0, 0.2)' }; // Gold
      if (index === 1) return { icon: <FaMedal size={24} color="#C0C0C0"/>, color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.2)' }; // Silver
      if (index === 2) return { icon: <FaMedal size={24} color="#CD7F32"/>, color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.2)' }; // Bronze
      return { icon: <span style={{fontWeight:'bold', fontSize:'1.2rem'}}>#{index + 1}</span>, color: 'white', bg: 'rgba(255,255,255,0.05)' };
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b, #0f172a)', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}><Navbar /></div>

      <div style={{ maxWidth: '800px', margin: isMobile ? '20px auto' : '40px auto', padding: '20px', width: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', margin: '0 0 10px 0' }}>🏆 Hall of Fame</h1>
            <p style={{ color: '#aaa', fontSize: isMobile ? '1rem' : '1.2rem' }}>Top students mastering the tech world.</p>
        </div>

        {loading ? <div className="spinner"></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {leaders.map((user, index) => {
                    const style = getRankStyle(index);
                    return (
                        <div key={user.user_id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: style.bg, padding: '20px', borderRadius: '15px',
                            border: `1px solid ${style.color}`,
                            boxShadow: `0 4px 15px ${style.bg}`,
                            transition: 'transform 0.2s',
                            flexDirection: 'row'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px' }}>
                                <div style={{ width: '50px', textAlign: 'center' }}>{style.icon}</div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.2rem' }}>{user.full_name}</h3>
                                    <span style={{ fontSize: '0.9rem', color: '#aaa' }}>{index < 3 ? "Top Performer" : "Rising Star"}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ margin: 0, color: style.color, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>{user.score} pts</h2>
                            </div>
                        </div>
                    );
                })}
                {leaders.length === 0 && <p style={{textAlign:'center', color:'#666'}}>No champions yet. Be the first!</p>}
            </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;