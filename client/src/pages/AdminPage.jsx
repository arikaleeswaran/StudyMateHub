import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { FaUsers, FaMapMarkedAlt, FaSmile, FaTrash, FaExclamationCircle } from 'react-icons/fa';

function AdminPage() {
  const [stats, setStats] = useState({ users: 0, roadmaps: 0, satisfaction: 0 });
  const [roadmaps, setRoadmaps] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    setLoading(true);
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        
        const statsRes = await axios.get(`${baseUrl}/api/admin/stats`);
        setStats(statsRes.data);

        const mapsRes = await axios.get(`${baseUrl}/api/admin/roadmaps`);
        setRoadmaps(mapsRes.data);

        const feedRes = await axios.get(`${baseUrl}/api/admin/feedback`);
        setFeedbacks(feedRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleDeleteRoadmap = async (topic) => {
      if(!confirm("⚠️ Admin Action: Permanently delete this roadmap?")) return;
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          await axios.delete(`${baseUrl}/api/admin/delete_roadmap?topic=${topic}`);
          alert("Deleted.");
          fetchAllData(); // Refresh
      } catch(e) { alert("Failed to delete"); }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b, #0f172a)', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}><Navbar /></div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚡ Admin Command Center</h1>
        <p style={{ color: '#aaa', marginBottom: '40px' }}>Monitor platform health and moderate content.</p>

        {/* --- STATS WIDGETS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div style={styles.card}>
                <div style={styles.iconBox}><FaUsers size={24} color="#00d2ff"/></div>
                <div><h3 style={{margin:0}}>{stats.users}</h3><span style={{color:'#aaa', fontSize:'0.9rem'}}>Total Users</span></div>
            </div>
            <div style={styles.card}>
                <div style={styles.iconBox}><FaMapMarkedAlt size={24} color="#ffc107"/></div>
                <div><h3 style={{margin:0}}>{stats.roadmaps}</h3><span style={{color:'#aaa', fontSize:'0.9rem'}}>Total Roadmaps</span></div>
            </div>
            <div style={styles.card}>
                <div style={styles.iconBox}><FaSmile size={24} color="#28a745"/></div>
                <div><h3 style={{margin:0}}>{stats.satisfaction}%</h3><span style={{color:'#aaa', fontSize:'0.9rem'}}>Global Satisfaction</span></div>
            </div>
        </div>

        {/* --- TABS --- */}
        <div style={{display:'flex', gap:'20px', marginBottom:'30px', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
            <button onClick={() => setActiveTab('dashboard')} style={{...styles.tab, borderBottom: activeTab === 'dashboard' ? '3px solid #00d2ff' : 'none', color: activeTab==='dashboard'?'#00d2ff':'#aaa'}}>Recent Roadmaps</button>
            <button onClick={() => setActiveTab('feedback')} style={{...styles.tab, borderBottom: activeTab === 'feedback' ? '3px solid #00d2ff' : 'none', color: activeTab==='feedback'?'#00d2ff':'#aaa'}}>User Feedback</button>
        </div>

        {/* --- CONTENT AREA --- */}
        {loading ? <div className="spinner"></div> : (
            <>
                {activeTab === 'dashboard' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        {roadmaps.map((map, i) => (
                            <div key={i} style={styles.listItem}>
                                <div>
                                    <h4 style={{margin:'0 0 5px 0'}}>{map.topic}</h4>
                                    <span style={{fontSize:'0.8rem', color:'#666'}}>ID: {map.id} • Created: {new Date(map.created_at).toLocaleDateString()}</span>
                                </div>
                                <button onClick={() => handleDeleteRoadmap(map.topic)} style={styles.deleteBtn}><FaTrash/> Delete</button>
                            </div>
                        ))}
                        {roadmaps.length === 0 && <p style={{color:'#666'}}>No roadmaps found.</p>}
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
                        {feedbacks.map((item, i) => (
                            <div key={i} style={{...styles.card, display:'block'}}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                    <span style={{fontWeight:'bold', color:'#00d2ff'}}>{item.topic}</span>
                                    <span style={{fontSize:'0.8rem', color: item.sentiment_score > 0 ? '#28a745' : '#dc3545'}}>
                                        {item.sentiment_score > 0 ? "Positive" : "Negative"}
                                    </span>
                                </div>
                                <p style={{fontSize:'0.95rem', lineHeight:'1.5', margin:'0 0 10px 0'}}>"{item.feedback_text}"</p>
                                <span style={{fontSize:'0.8rem', color:'#666'}}>- {item.node_label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}

const styles = {
    card: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:'15px' },
    iconBox: { width:'50px', height:'50px', borderRadius:'12px', background:'rgba(255,255,255,0.05)', display:'flex', justifyContent:'center', alignItems:'center' },
    tab: { background:'none', border:'none', padding:'10px 20px', cursor:'pointer', fontWeight:'bold', fontSize:'1rem' },
    listItem: { background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '10px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.05)' },
    deleteBtn: { background: 'rgba(220, 53, 69, 0.2)', color: '#dc3545', border: '1px solid #dc3545', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', display:'flex', alignItems:'center', gap:'5px' }
};

export default AdminPage;