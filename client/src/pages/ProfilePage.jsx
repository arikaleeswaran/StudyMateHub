import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { FaFolder, FaFolderOpen, FaArrowLeft, FaVideo, FaFilePdf, FaStar, FaChevronRight, FaChevronDown } from 'react-icons/fa';

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [folders, setFolders] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState(""); 

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
        // DEBUG: Print User ID
        let debugLog = `Current User ID: ${user.id}\n`;

        // 1. Fetch saved roadmaps (FIX: Use .from instead of .table)
        const roadmaps = await supabase.from('user_roadmaps').select('*').eq('user_id', user.id);
        debugLog += `Roadmaps Found: ${roadmaps.data?.length || 0}\n`;
        
        // 2. Fetch resources (FIX: Use .from)
        const resources = await supabase.from('saved_resources').select('*').eq('user_id', user.id);
        debugLog += `Resources Found: ${resources.data?.length || 0}\n`;

        // 3. Fetch scores (FIX: Use .from)
        const scores = await supabase.from('node_progress').select('*').eq('user_id', user.id);
        debugLog += `Scores Found: ${scores.data?.length || 0}\n`;

        setDebugInfo(debugLog); 

        // GROUPING LOGIC
        const grouped = {};
        
        if (roadmaps.data) {
            roadmaps.data.forEach(r => {
                const topicKey = r.topic; 
                if (!grouped[topicKey]) grouped[topicKey] = { subfolders: {} };
            });
        }

        if (resources.data) {
            resources.data.forEach(r => {
                const topicKey = r.roadmap_topic; 
                if (!grouped[topicKey]) grouped[topicKey] = { subfolders: {} };
                
                if (!grouped[topicKey].subfolders[r.node_label]) {
                    grouped[topicKey].subfolders[r.node_label] = { resources: [], scores: [] };
                }
                grouped[topicKey].subfolders[r.node_label].resources.push(r);
            });
        }

        if (scores.data) {
            scores.data.forEach(s => {
                Object.keys(grouped).forEach(topicKey => {
                    if (!grouped[topicKey].subfolders[s.node_label]) {
                         grouped[topicKey].subfolders[s.node_label] = { resources: [], scores: [] };
                    }
                    grouped[topicKey].subfolders[s.node_label].scores.push(s);
                });
            });
        }

        setFolders(grouped);

    } catch (error) {
        console.error("Error loading profile:", error);
        setDebugInfo(prev => prev + `\nCRITICAL ERROR: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  const toggleFolder = (topic) => {
    setExpandedFolders(prev => ({ ...prev, [topic]: !prev[topic] }));
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Segoe UI' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <button onClick={() => navigate(-1)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#555'}} title="Go Back"><FaArrowLeft/></button>
            <h1 style={{ margin: 0 }}>My Library</h1>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* DEBUG BOX (This should now show "Roadmaps Found: 1" instead of Error) */}
      <div style={{background:'#333', color:'#0f0', padding:'15px', borderRadius:'8px', marginBottom:'20px', fontFamily:'monospace', fontSize:'0.9rem', whiteSpace:'pre-wrap'}}>
        <strong>🛠️ STATUS:</strong><br/>
        {debugInfo || "Loading..."}
      </div>

      {/* CONTENT */}
      {loading ? <p>Loading your library...</p> : Object.keys(folders).length === 0 ? (
          <div style={{textAlign:'center', padding:'50px', background:'#f9f9f9', borderRadius:'10px'}}>
              <h3>No Saved Content 📂</h3>
              <p>Go search for a topic and click "Save Roadmap"!</p>
          </div>
      ) : (
          <div>
              {Object.keys(folders).map(topic => (
                  <div key={topic} style={{ marginBottom: '20px', border: '1px solid #eee', borderRadius: '10px', overflow:'hidden' }}>
                      
                      {/* MAIN FOLDER HEADER */}
                      <div 
                        onClick={() => toggleFolder(topic)}
                        style={{ padding: '20px', background: '#f8f9fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', fontWeight: 'bold' }}
                      >
                          {expandedFolders[topic] ? <FaFolderOpen color="#ffc107" size={24}/> : <FaFolder color="#ffc107" size={24}/>}
                          <span style={{fontSize:'1.1rem', textTransform:'capitalize'}}>{topic}</span>
                          <span style={{marginLeft:'auto', color:'#999'}}>{expandedFolders[topic] ? <FaChevronDown/> : <FaChevronRight/>}</span>
                      </div>

                      {/* SUB-FOLDERS */}
                      {expandedFolders[topic] && (
                          <div style={{ padding: '20px', background: 'white' }}>
                              <button onClick={() => navigate(`/roadmap/${topic}`)} style={{marginBottom:'20px', padding:'8px 15px', background:'#007bff', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem'}}>
                                  View Full Interactive Map 🗺️
                              </button>

                              {Object.keys(folders[topic].subfolders).length === 0 ? (
                                  <p style={{color:'#aaa', fontStyle:'italic'}}>No resources saved in this folder yet.</p>
                              ) : (
                                  Object.keys(folders[topic].subfolders).map(subNode => (
                                      <div key={subNode} style={{ marginLeft: '20px', marginBottom: '20px', paddingLeft: '15px', borderLeft: '3px solid #eee' }}>
                                          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📁 {subNode}</h4>
                                          
                                          {/* SCORES */}
                                          {folders[topic].subfolders[subNode].scores.map((s, i) => (
                                              <div key={i} style={{display:'inline-block', padding:'5px 10px', background:'#e8f5e9', color:'green', borderRadius:'15px', fontSize:'0.8rem', marginRight:'10px', marginBottom:'10px'}}>
                                                  <FaStar/> Score: {s.quiz_score}/5
                                              </div>
                                          ))}

                                          {/* RESOURCES */}
                                          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px'}}>
                                              {folders[topic].subfolders[subNode].resources.map(res => (
                                                  <a key={res.id} href={res.url} target="_blank" rel="noreferrer" style={{
                                                      display:'flex', alignItems:'center', gap:'10px', padding:'10px', 
                                                      background:'white', border:'1px solid #eee', borderRadius:'8px', textDecoration:'none', color:'#333', fontSize:'0.9rem'
                                                  }}>
                                                      {res.resource_type === 'video' ? <FaVideo color="#d32f2f"/> : <FaFilePdf color="#2e7d32"/>}
                                                      <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{res.title}</span>
                                                  </a>
                                              ))}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}

export default ProfilePage;