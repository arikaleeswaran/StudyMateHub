import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import Axios for Deleting
import { FaFolder, FaFolderOpen, FaArrowLeft, FaVideo, FaFilePdf, FaStar, FaChevronRight, FaChevronDown, FaChartBar, FaBook, FaGlobe, FaTrash } from 'react-icons/fa';

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [folders, setFolders] = useState({});
  const [allScores, setAllScores] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [activeTab, setActiveTab] = useState('library');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const roadmaps = await supabase.from('user_roadmaps').select('*').eq('user_id', user.id);
        const resources = await supabase.from('saved_resources').select('*').eq('user_id', user.id);
        const scores = await supabase.from('node_progress').select('*').eq('user_id', user.id).order('created_at', {ascending: false});

        setAllScores(scores.data || []);

        const grouped = {};
        
        // 1. Folders (Roadmaps)
        roadmaps.data?.forEach(r => {
            const key = r.topic;
            if (!grouped[key]) grouped[key] = { hasRoadmap: true, subfolders: {} };
            else grouped[key].hasRoadmap = true;
        });

        // 2. Resources
        resources.data?.forEach(r => {
            const key = r.roadmap_topic;
            if (!grouped[key]) grouped[key] = { hasRoadmap: false, subfolders: {} };
            if (!grouped[key].subfolders[r.node_label]) {
                grouped[key].subfolders[r.node_label] = { resources: [], scores: [] };
            }
            grouped[key].subfolders[r.node_label].resources.push(r);
        });

        // 3. Scores
        scores.data?.forEach(s => {
            const key = s.topic; 
            if (key) {
                if (!grouped[key]) grouped[key] = { hasRoadmap: false, subfolders: {} };
                if (!grouped[key].subfolders[s.node_label]) {
                    grouped[key].subfolders[s.node_label] = { resources: [], scores: [] };
                }
                grouped[key].subfolders[s.node_label].scores.push(s);
            }
        });

        setFolders(grouped);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteRoadmap = async (topic) => {
    if(!window.confirm(`Are you sure you want to delete the "${topic}" roadmap?`)) return;
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.delete(`${baseUrl}/api/delete_roadmap?user_id=${user.id}&topic=${topic}`);
        fetchData(); // Refresh
    } catch(e) { alert("Error deleting roadmap"); }
  };

  const handleDeleteResource = async (id) => {
    if(!window.confirm("Delete this resource?")) return;
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.delete(`${baseUrl}/api/delete_resource?id=${id}`);
        fetchData(); // Refresh
    } catch(e) { alert("Error deleting resource"); }
  };

  const toggleFolder = (topic) => setExpandedFolders(prev => ({ ...prev, [topic]: !prev[topic] }));
  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Segoe UI' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <button onClick={() => navigate(-1)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#555'}} title="Go Back"><FaArrowLeft/></button>
            <h1 style={{ margin: 0 }}>My Library</h1>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:'20px', marginBottom:'30px', borderBottom:'1px solid #eee'}}>
          <button onClick={() => setActiveTab('library')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'library' ? '3px solid #007bff' : 'none', fontWeight:'bold', color: activeTab === 'library' ? '#007bff' : '#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}><FaBook/> My Library</button>
          <button onClick={() => setActiveTab('assessments')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'assessments' ? '3px solid #007bff' : 'none', fontWeight:'bold', color: activeTab === 'assessments' ? '#007bff' : '#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}><FaChartBar/> My Assessments</button>
      </div>

      {loading ? <p>Loading...</p> : (
          activeTab === 'library' ? (
              Object.keys(folders).length === 0 ? <div style={{textAlign:'center', padding:'50px', background:'#f9f9f9'}}><h3>No Saved Content 📂</h3></div> :
              <div>
                  {Object.keys(folders).map(topic => (
                      <div key={topic} style={{ marginBottom: '20px', border: '1px solid #eee', borderRadius: '10px', overflow:'hidden' }}>
                          <div style={{ padding: '20px', background: '#f8f9fa', display: 'flex', alignItems: 'center', gap: '15px' }}>
                              
                              {/* Toggle Click Area */}
                              <div onClick={() => toggleFolder(topic)} style={{display:'flex', alignItems:'center', gap:'15px', flex:1, cursor:'pointer', fontWeight:'bold'}}>
                                {expandedFolders[topic] ? <FaFolderOpen color="#ffc107" size={24}/> : <FaFolder color="#ffc107" size={24}/>}
                                <span style={{fontSize:'1.1rem', textTransform:'capitalize'}}>{topic}</span>
                                <span style={{marginLeft:'auto', color:'#999', marginRight:'10px'}}>{expandedFolders[topic] ? <FaChevronDown/> : <FaChevronRight/>}</span>
                              </div>

                              {/* Delete Folder Button (Only if roadmap exists) */}
                              {folders[topic].hasRoadmap && (
                                <button onClick={() => handleDeleteRoadmap(topic)} style={{background:'none', border:'none', cursor:'pointer', color:'#dc3545'}} title="Delete Roadmap Path">
                                    <FaTrash />
                                </button>
                              )}
                          </div>

                          {expandedFolders[topic] && (
                              <div style={{ padding: '20px', background: 'white' }}>
                                  {/* View Map Button */}
                                  {folders[topic].hasRoadmap && (
                                      <button onClick={() => navigate(`/roadmap/${topic}`)} style={{marginBottom:'20px', padding:'8px 15px', background:'#007bff', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem'}}>View Map 🗺️</button>
                                  )}

                                  {Object.keys(folders[topic].subfolders).map(subNode => (
                                      <div key={subNode} style={{ marginLeft: '20px', marginBottom: '20px', paddingLeft: '15px', borderLeft: '3px solid #eee' }}>
                                          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📁 {subNode}</h4>
                                          
                                          {/* Scores */}
                                          {folders[topic].subfolders[subNode].scores.map((s, i) => (
                                              <div key={i} style={{display:'inline-block', padding:'5px 10px', background:'#e8f5e9', color:'green', borderRadius:'15px', fontSize:'0.8rem', marginRight:'10px', marginBottom:'10px'}}>
                                                  <FaStar/> Score: {s.quiz_score}/5
                                              </div>
                                          ))}

                                          {/* Resources List */}
                                          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px'}}>
                                              {folders[topic].subfolders[subNode].resources.map(res => (
                                                  <div key={res.id} style={{position:'relative', display:'flex', alignItems:'center', gap:'10px', padding:'10px', background:'white', border:'1px solid #eee', borderRadius:'8px'}}>
                                                      <a href={res.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'8px', flex:1, overflow:'hidden'}}>
                                                          {res.resource_type === 'video' ? <FaVideo color="#d32f2f"/> : res.resource_type === 'article' ? <FaGlobe color="#28a745"/> : <FaFilePdf color="#ffc107"/>}
                                                          <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{res.title}</span>
                                                      </a>
                                                      <button onClick={() => handleDeleteResource(res.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:'0 5px'}} title="Remove">
                                                          <FaTrash size={12}/>
                                                      </button>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          ) : (
              // Assessments Tab
              <div>
                  {allScores.length === 0 ? <p>No assessments taken yet.</p> : (
                      <div style={{display:'grid', gap:'15px'}}>
                          {allScores.map(score => (
                              <div key={score.id} style={{padding:'20px', border:'1px solid #eee', borderRadius:'10px', background:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <div>
                                      <h3 style={{margin:'0 0 5px 0'}}>{score.node_label}</h3>
                                      <span style={{fontSize:'0.9rem', color:'#666', background:'#f0f0f0', padding:'2px 8px', borderRadius:'4px'}}>{score.topic || "Unknown Topic"}</span>
                                      <p style={{fontSize:'0.9rem', color:'#888', margin:'5px 0 0 0'}}>Feedback: {score.feedback_text || "None"}</p>
                                  </div>
                                  <div style={{textAlign:'right'}}>
                                      <h2 style={{margin:0, color: score.quiz_score >=3 ? 'green' : 'orange'}}>{score.quiz_score}/5</h2>
                                      <small style={{color:'#aaa'}}>{new Date(score.created_at).toLocaleDateString()}</small>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )
      )}
    </div>
  );
}

export default ProfilePage;