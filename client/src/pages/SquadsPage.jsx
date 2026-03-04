import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { FaUsers, FaShieldAlt, FaPlus, FaSignInAlt, FaCrown, FaCopy, FaTrophy } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import useMobile from '../hooks/useMobile';

function SquadsPage() {
  const { user } = useAuth();
  const [mySquad, setMySquad] = useState(null);
  const [squadLeaderboard, setSquadLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [activeTab, setActiveTab] = useState('my_squad'); 
  
  const isMobile = useMobile();

  useEffect(() => {
      if(user) fetchData();
  }, [user]);

  const fetchData = async () => {
      setLoading(true);
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          const squadRes = await axios.get(`${baseUrl}/api/squad/my_squad?user_id=${user.id}`);
          setMySquad(squadRes.data);
          const rankRes = await axios.get(`${baseUrl}/api/squad/leaderboard`);
          setSquadLeaderboard(rankRes.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
  };

  const handleCreate = async () => {
      if(!createName) return;
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          await axios.post(`${baseUrl}/api/squad/create`, { user_id: user.id, name: createName });
          alert("Squad Created! 🛡️");
          fetchData();
      } catch(e) { alert("Error creating squad"); }
  };

  const handleJoin = async () => {
      if(!joinCode) return;
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          await axios.post(`${baseUrl}/api/squad/join`, { user_id: user.id, code: joinCode });
          alert("Joined Squad! 🚀");
          fetchData();
      } catch(e) { alert("Invalid Code"); }
  };

  const copyCode = () => {
      navigator.clipboard.writeText(mySquad.details.join_code);
      alert("Code Copied!");
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'transparent', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}><Navbar /></div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '20px' : '40px', width: '100%' }}>
        <div style={{textAlign:'center', marginBottom:'40px'}}>
            <h1 style={{fontSize: isMobile?'2rem':'3rem', margin:'0 0 10px 0', display:'flex', alignItems:'center', justifyContent:'center', gap:'15px'}}>
                <FaShieldAlt color="var(--accent-blue)"/> Engineering Squads
            </h1>
            <p style={{color:'var(--text-muted)', fontSize:'1.1rem'}}>Join forces. Compete globally. Dominate.</p>
        </div>

        <div style={{display:'flex', justifyContent:'center', gap:'20px', marginBottom:'30px'}}>
            <button onClick={() => setActiveTab('my_squad')} style={{...styles.tab, borderBottom: activeTab==='my_squad'?'3px solid var(--accent-blue)':'none', color: activeTab==='my_squad'?'var(--accent-blue)':'var(--text-muted)'}}>My HQ</button>
            <button onClick={() => setActiveTab('rankings')} style={{...styles.tab, borderBottom: activeTab==='rankings'?'3px solid #ffc107':'none', color: activeTab==='rankings'?'#ffc107':'var(--text-muted)'}}>Global Wars</button>
        </div>

        {loading ? <div className="spinner"></div> : (
            <>
                {activeTab === 'my_squad' && (
                    <div>
                        {mySquad ? (
                            <div style={{background:'var(--card-bg)', borderRadius:'20px', padding:'30px', border:'1px solid var(--card-border)'}}>
                                <div style={{display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'20px', borderBottom:'1px solid var(--card-border)', paddingBottom:'20px', marginBottom:'20px'}}>
                                    <div>
                                        <h2 style={{margin:'0 0 5px 0', fontSize:'2rem'}}>{mySquad.details.name}</h2>
                                        <div style={{display:'flex', alignItems:'center', gap:'10px', color:'var(--accent-blue)', fontSize:'1.1rem'}}>
                                            <FaCrown/> Total Score: {mySquad.details.total_score}
                                        </div>
                                    </div>
                                    <div style={{background:'rgba(0, 123, 255, 0.1)', padding:'10px 20px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', border:'1px solid var(--accent-blue)'}}>
                                        <span style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>INVITE CODE:</span>
                                        <strong style={{fontSize:'1.2rem', letterSpacing:'2px'}}>{mySquad.details.join_code}</strong>
                                        <FaCopy style={{cursor:'pointer'}} onClick={copyCode}/>
                                    </div>
                                </div>
                                <h3 style={{display:'flex', alignItems:'center', gap:'10px'}}><FaUsers/> Operatives ({mySquad.members.length})</h3>
                                <div style={{display:'grid', gap:'10px'}}>
                                    {mySquad.members.map((mem, i) => (
                                        <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', background:'var(--card-hover)', borderRadius:'10px'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                                <div style={{width:'30px', height:'30px', borderRadius:'50%', background:'var(--text-muted)', color:'white', display:'flex', justifyContent:'center', alignItems:'center', fontWeight:'bold'}}>{i+1}</div>
                                                <span style={{fontSize:'1.1rem'}}>{mem.full_name}</span>
                                            </div>
                                            <span style={{color:'#ffc107', fontWeight:'bold'}}>{mem.score} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'30px'}}>
                                <div style={styles.actionCard}>
                                    <FaPlus size={40} color="var(--accent-green)" style={{marginBottom:'20px'}}/>
                                    <h2>Start a Squad</h2>
                                    <input type="text" placeholder="Squad Name" value={createName} onChange={e => setCreateName(e.target.value)} style={styles.input}/>
                                    <button onClick={handleCreate} style={{...styles.btn, background:'var(--accent-green)'}}>Create & Lead</button>
                                </div>
                                <div style={styles.actionCard}>
                                    <FaSignInAlt size={40} color="var(--accent-blue)" style={{marginBottom:'20px'}}/>
                                    <h2>Join a Squad</h2>
                                    <input type="text" placeholder="Enter Code (e.g. TRX-404)" value={joinCode} onChange={e => setJoinCode(e.target.value)} style={styles.input}/>
                                    <button onClick={handleJoin} style={{...styles.btn, background:'var(--accent-blue)'}}>Join Forces</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'rankings' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        {squadLeaderboard.map((squad, i) => (
                            <div key={squad.id} style={{
                                display:'flex', justifyContent:'space-between', alignItems:'center',
                                padding:'20px', background: i===0 ? 'rgba(255, 215, 0, 0.1)' : 'var(--card-bg)',
                                border: i===0 ? '1px solid #FFD700' : '1px solid var(--card-border)',
                                borderRadius:'15px'
                            }}>
                                <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                                    {i===0 ? <FaTrophy color="#FFD700" size={30}/> : <span style={{fontSize:'1.5rem', fontWeight:'bold', color:'var(--text-muted)', width:'30px'}}>#{i+1}</span>}
                                    <h3 style={{margin:0, fontSize:'1.3rem'}}>{squad.name}</h3>
                                </div>
                                <h2 style={{margin:0, color: i===0?'#FFD700':'var(--text-main)'}}>{squad.total_score} pts</h2>
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
    tab: { background:'none', border:'none', padding:'10px 30px', fontSize:'1.2rem', fontWeight:'bold', cursor:'pointer' },
    actionCard: { background:'var(--card-bg)', padding:'40px', borderRadius:'20px', textAlign:'center', border:'1px solid var(--card-border)' },
    input: { width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid var(--card-border)', marginBottom:'15px', background:'var(--card-hover)', color:'var(--text-main)', textAlign:'center', fontSize:'1.1rem' },
    btn: { width:'100%', padding:'12px', borderRadius:'8px', border:'none', color:'white', fontWeight:'bold', fontSize:'1.1rem', cursor:'pointer' }
};

export default SquadsPage;