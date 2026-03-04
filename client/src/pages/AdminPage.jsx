import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FaUsers, FaMapMarkedAlt, FaSmile, FaTrash, FaEyeSlash, FaEye, FaShieldAlt } from 'react-icons/fa';
import useMobile from '../hooks/useMobile';

function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, roadmaps: 0, satisfaction: 0 });
  const [roadmaps, setRoadmaps] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [students, setStudents] = useState([]);
  const [squads, setSquads] = useState([]); // ✅ Added squads state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const isMobile = useMobile();

  useEffect(() => {
      const isAdmin = localStorage.getItem('admin_auth');
      if (!isAdmin) {
          navigate('/admin/login'); 
      } else {
          fetchAllData();
      }
  }, []);

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

        const usersRes = await axios.get(`${baseUrl}/api/admin/users`);
        setStudents(usersRes.data);

        // ✅ Fetch squads
        const squadsRes = await axios.get(`${baseUrl}/api/admin/squads`);
        setSquads(squadsRes.data);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDeleteRoadmap = async (id) => {
      if(!confirm("⚠️ Admin Action: Permanently delete this roadmap?")) return;
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          await axios.delete(`${baseUrl}/api/admin/delete_roadmap?id=${id}`);
          alert("Roadmap Deleted.");
          fetchAllData(); 
      } catch(e) { alert("Failed to delete"); }
  };

  // ✅ NEW: Hide User Logic
  const handleToggleHideUser = async (userId, currentStatus) => {
      const action = currentStatus ? "unhide" : "hide (shadowban)";
      if(!confirm(`⚠️ Admin Action: Are you sure you want to ${action} this user from the public leaderboard?`)) return;
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          await axios.post(`${baseUrl}/api/admin/users/hide`, { user_id: userId, is_hidden: !currentStatus });
          fetchAllData(); 
      } catch(e) { alert("Failed to update user status"); }
  };

  // ✅ NEW: Delete User Logic
  const handleDeleteUser = async (userId) => {
      if(!confirm("🛑 CRITICAL ACTION: This will permanently wipe all scores, roadmaps, and data for this user. Are you absolutely sure?")) return;
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          await axios.delete(`${baseUrl}/api/admin/users/delete?user_id=${userId}`);
          alert("User data completely wiped.");
          fetchAllData(); 
      } catch(e) { alert("Failed to delete user"); }
  };

  // ✅ NEW: Delete Squad Logic
  const handleDeleteSquad = async (squadId) => {
      if(!confirm("⚠️ Admin Action: Disbanding this squad will remove all members from it. Continue?")) return;
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          await axios.delete(`${baseUrl}/api/admin/squads/delete?squad_id=${squadId}`);
          alert("Squad disbanded.");
          fetchAllData(); 
      } catch(e) { alert("Failed to disband squad"); }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'transparent', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}><Navbar /></div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '20px' : '40px', width: '100%' }}>
        <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', marginBottom: '10px' }}>⚡ Admin Command Center</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Monitor platform health, manage users, and moderate content.</p>

        {/* --- STATS WIDGETS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div style={styles.card}>
                <div style={styles.iconBox}><FaUsers size={24} color="var(--accent-blue)"/></div>
                <div><h3 style={{margin:0}}>{stats.users}</h3><span style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>Total Users</span></div>
            </div>
            <div style={styles.card}>
                <div style={styles.iconBox}><FaMapMarkedAlt size={24} color="#ffc107"/></div>
                <div><h3 style={{margin:0}}>{stats.roadmaps}</h3><span style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>Total Roadmaps</span></div>
            </div>
            <div style={styles.card}>
                <div style={styles.iconBox}><FaSmile size={24} color="var(--accent-green)"/></div>
                <div><h3 style={{margin:0}}>{stats.satisfaction}%</h3><span style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>Global Satisfaction</span></div>
            </div>
        </div>

        {/* --- TABS --- */}
        <div style={{display:'flex', gap:'20px', marginBottom:'30px', borderBottom:'1px solid var(--card-border)', overflowX: 'auto'}}>
            <button onClick={() => setActiveTab('dashboard')} style={{...styles.tab, borderBottom: activeTab === 'dashboard' ? '3px solid var(--accent-blue)' : 'none', color: activeTab==='dashboard'?'var(--accent-blue)':'var(--text-muted)', whiteSpace: 'nowrap'}}>Roadmaps</button>
            <button onClick={() => setActiveTab('students')} style={{...styles.tab, borderBottom: activeTab === 'students' ? '3px solid var(--accent-blue)' : 'none', color: activeTab==='students'?'var(--accent-blue)':'var(--text-muted)', whiteSpace: 'nowrap'}}>Users</button>
            <button onClick={() => setActiveTab('squads')} style={{...styles.tab, borderBottom: activeTab === 'squads' ? '3px solid var(--accent-blue)' : 'none', color: activeTab==='squads'?'var(--accent-blue)':'var(--text-muted)', whiteSpace: 'nowrap'}}>Squads</button>
            <button onClick={() => setActiveTab('feedback')} style={{...styles.tab, borderBottom: activeTab === 'feedback' ? '3px solid var(--accent-blue)' : 'none', color: activeTab==='feedback'?'var(--accent-blue)':'var(--text-muted)', whiteSpace: 'nowrap'}}>Feedback</button>
        </div>

        {/* --- CONTENT AREA --- */}
        {loading ? <div className="spinner"></div> : (
            <>
                {/* ROADMAPS TAB */}
                {activeTab === 'dashboard' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        {roadmaps.map((map, i) => (
                            <div key={i} style={styles.listItem}>
                                <div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <h4 style={{margin:'0 0 5px 0'}}>{map.topic}</h4>
                                        <span style={{fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: map.mode === 'panic' ? 'rgba(220,53,69,0.1)' : 'rgba(0,123,255,0.1)', color: map.mode === 'panic' ? 'var(--accent-red)' : 'var(--accent-blue)'}}>
                                            {map.mode.toUpperCase()}
                                        </span>
                                    </div>
                                    <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>ID: {map.id} • Created: {new Date(map.created_at).toLocaleDateString()}</span>
                                </div>
                                <button onClick={() => handleDeleteRoadmap(map.id)} style={styles.deleteBtn}><FaTrash/> Delete</button>
                            </div>
                        ))}
                        {roadmaps.length === 0 && <p style={{color:'var(--text-muted)'}}>No roadmaps found.</p>}
                    </div>
                )}

                {/* USERS / STUDENTS TAB */}
                {activeTab === 'students' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        {students.map((student, i) => (
                            <div key={student.user_id} style={{...styles.listItem, background: student.is_hidden ? 'var(--card-hover)' : 'var(--card-bg)', border: student.is_hidden ? '1px dashed var(--accent-red)' : '1px solid var(--card-border)'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                    <div style={{width:'40px', height:'40px', background:'rgba(0, 123, 255, 0.1)', color:'var(--accent-blue)', borderRadius:'50%', display:'flex', justifyContent:'center', alignItems:'center', fontWeight:'bold'}}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h4 style={{margin:'0 0 5px 0', color: student.is_hidden ? 'var(--text-muted)' : 'var(--text-main)'}}>
                                            {student.full_name || "Anonymous"} 
                                            {student.is_hidden && <span style={{fontSize:'0.7rem', color:'var(--accent-red)', marginLeft:'10px'}}>(HIDDEN)</span>}
                                        </h4>
                                        <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>ID: {student.user_id}</span>
                                    </div>
                                </div>
                                
                                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                                    <div style={{textAlign:'right'}}>
                                        <h3 style={{margin:0, color:'#ffc107'}}>{student.score} pts</h3>
                                        <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Squad ID: {student.squad_id || "None"}</span>
                                    </div>

                                    {/* Admin Action Buttons */}
                                    <div style={{display: 'flex', gap: '10px', borderLeft: '1px solid var(--card-border)', paddingLeft: '20px'}}>
                                        <button 
                                            onClick={() => handleToggleHideUser(student.user_id, student.is_hidden)}
                                            style={{...styles.actionBtn, color: student.is_hidden ? 'var(--accent-green)' : 'var(--text-muted)'}}
                                            title={student.is_hidden ? "Unhide User" : "Hide from Leaderboard"}
                                        >
                                            {student.is_hidden ? <FaEye size={18}/> : <FaEyeSlash size={18}/>}
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(student.user_id)}
                                            style={{...styles.actionBtn, color: 'var(--accent-red)'}}
                                            title="Wipe User Data"
                                        >
                                            <FaTrash size={18}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {students.length === 0 && <p style={{color:'var(--text-muted)'}}>No students registered yet.</p>}
                    </div>
                )}

                {/* SQUADS TAB */}
                {activeTab === 'squads' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        {squads.map((squad) => (
                            <div key={squad.id} style={styles.listItem}>
                                <div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <FaShieldAlt color="var(--accent-blue)"/>
                                        <h4 style={{margin:'0 0 5px 0'}}>{squad.name}</h4>
                                    </div>
                                    <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Code: <strong>{squad.join_code}</strong> • ID: {squad.id}</span>
                                </div>
                                
                                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                                    <div style={{textAlign:'right'}}>
                                        <h3 style={{margin:0, color:'#ffc107'}}>{squad.total_score} pts</h3>
                                        <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Total Score</span>
                                    </div>

                                    <div style={{borderLeft: '1px solid var(--card-border)', paddingLeft: '20px'}}>
                                        <button onClick={() => handleDeleteSquad(squad.id)} style={styles.deleteBtn}><FaTrash/> Disband</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {squads.length === 0 && <p style={{color:'var(--text-muted)'}}>No active squads.</p>}
                    </div>
                )}

                {/* FEEDBACK TAB */}
                {activeTab === 'feedback' && (
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
                        {feedbacks.map((item, i) => (
                            <div key={i} style={{...styles.card, display:'block'}}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                    <span style={{fontWeight:'bold', color:'var(--accent-blue)'}}>{item.topic}</span>
                                    <span style={{fontSize:'0.8rem', color: item.sentiment_score > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}}>
                                        {item.sentiment_score > 0 ? "Positive" : "Negative"}
                                    </span>
                                </div>
                                <p style={{fontSize:'0.95rem', lineHeight:'1.5', margin:'0 0 10px 0'}}>"{item.feedback_text}"</p>
                                <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>- {item.node_label} (User: {item.user_id.slice(0,6)}...)</span>
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
    card: { background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--card-border)', display:'flex', alignItems:'center', gap:'15px' },
    iconBox: { width:'50px', height:'50px', borderRadius:'12px', background:'var(--card-hover)', display:'flex', justifyContent:'center', alignItems:'center' },
    tab: { background:'none', border:'none', padding:'10px 20px', cursor:'pointer', fontWeight:'bold', fontSize:'1rem' },
    listItem: { background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '10px', display:'flex', justifyContent:'space-between', alignItems:'center' },
    deleteBtn: { background: 'rgba(220, 53, 69, 0.1)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', display:'flex', alignItems:'center', gap:'5px' },
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }
};

export default AdminPage;