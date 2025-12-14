import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaFolder, FaFolderOpen, FaArrowLeft, FaVideo, FaFilePdf, FaStar, FaChevronRight, FaChevronDown, FaChartBar, FaBook, FaGlobe, FaTrash, FaCheckCircle, FaRunning, FaRedo, FaExclamationTriangle, FaUserFriends, FaFire, FaPlus } from 'react-icons/fa';
import AssessmentModal from '../components/AssessmentModal';
import ConfirmationModal from '../components/ConfirmationModal'; // ✅ IMPORTED

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [folders, setFolders] = useState({});
  const [allScores, setAllScores] = useState([]);
  const [userRoadmaps, setUserRoadmaps] = useState([]); 
  const [expandedFolders, setExpandedFolders] = useState({});
  const [activeTab, setActiveTab] = useState('library');
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);

  // --- MODAL STATES ---
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeQuizData, setActiveQuizData] = useState(null);
  
  // ✅ NEW: DELETE CONFIRMATION STATE
  const [deleteConfirm, setDeleteConfirm] = useState({
      show: false,
      type: null,   // 'roadmap' or 'resource'
      id: null,     // topic name or resource ID
      title: ''     // For display text
  });

  useEffect(() => {
    if (user) {
        fetchData();
        fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => { /* ... existing code ... */ 
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const res = await axios.get(`${baseUrl}/api/recommendations?user_id=${user.id}`);
        setRecommendations(res.data);
      } catch (e) { console.error("Rec Error", e); }
  };

  const handleSaveRecommendation = async (rec) => { /* ... existing code ... */ 
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_resource`, {
            user_id: user.id, roadmap_topic: rec.topic, node_label: "Community Picks",
            resource_type: rec.resource_type, title: rec.title, url: rec.url, thumbnail: ''
        });
        alert("Saved to your Library!");
        fetchData();
        setRecommendations(prev => prev.filter(r => r.url !== rec.url));
      } catch(e) { alert("Error saving"); }
  };

  const fetchData = async () => { /* ... existing code ... */ 
    setLoading(true);
    try {
        const roadmaps = await supabase.from('user_roadmaps').select('*').eq('user_id', user.id);
        const resources = await supabase.from('saved_resources').select('*').eq('user_id', user.id);
        const scores = await supabase.from('node_progress').select('*').eq('user_id', user.id).order('created_at', {ascending: false});

        setAllScores(scores.data || []);
        setUserRoadmaps(roadmaps.data || []);

        const grouped = {};
        const normalize = (str) => str ? str.trim().toLowerCase() : "unknown";

        roadmaps.data?.forEach(r => {
            const key = normalize(r.topic); 
            if (!grouped[key]) grouped[key] = { displayTitle: r.topic, hasRoadmap: true, subfolders: {} };
            else grouped[key].hasRoadmap = true;
        });

        resources.data?.forEach(r => {
            const key = normalize(r.roadmap_topic);
            if (!grouped[key]) grouped[key] = { displayTitle: r.roadmap_topic, hasRoadmap: false, subfolders: {} };
            if (!grouped[key].subfolders[r.node_label]) grouped[key].subfolders[r.node_label] = { resources: [], scores: [] };
            grouped[key].subfolders[r.node_label].resources.push(r);
        });

        scores.data?.forEach(s => {
            const key = normalize(s.topic); 
            if (key) {
                if (!grouped[key]) grouped[key] = { displayTitle: s.topic, hasRoadmap: false, subfolders: {} };
                if (!grouped[key].subfolders[s.node_label]) grouped[key].subfolders[s.node_label] = { resources: [], scores: [] };
                grouped[key].subfolders[s.node_label].scores.push(s);
            }
        });
        setFolders(grouped);
    } catch (error) { console.error("Error:", error); } 
    finally { setLoading(false); }
  };

  const handleRetake = (mainTopic, subTopic) => {
      setActiveQuizData({ mainTopic, subTopic });
      setShowQuiz(true);
  };

  const handleQuizComplete = async (score, feedback) => { /* ... existing code ... */
      setShowQuiz(false);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/submit_progress`, {
            user_id: user.id, topic: activeQuizData.mainTopic, node_label: activeQuizData.subTopic, score: score, feedback: feedback
        });
        alert(`Score Saved: ${score}/10`);
        fetchData(); 
      } catch(e) { console.error(e); }
  };

  // ✅ UPDATED: Open Modal instead of Window.confirm
  const handleDeleteRoadmap = (topic) => {
      setDeleteConfirm({ show: true, type: 'roadmap', id: topic, title: topic });
  };

  const handleDeleteResource = (id) => {
      setDeleteConfirm({ show: true, type: 'resource', id: id, title: 'this resource' });
  };

  // ✅ NEW: Execute Delete
  const executeDelete = async () => {
      setDeleteConfirm(prev => ({ ...prev, show: false })); // Close modal
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          if (deleteConfirm.type === 'roadmap') {
              await axios.delete(`${baseUrl}/api/delete_roadmap?user_id=${user.id}&topic=${deleteConfirm.id}`);
          } else {
              await axios.delete(`${baseUrl}/api/delete_resource?id=${deleteConfirm.id}`);
          }
          fetchData(); // Refresh UI
      } catch(e) { alert("Error deleting."); }
  };

  const getNodeStatus = (topicTitle, nodeLabel) => { /* ... existing code ... */
      const normalize = (str) => str ? str.trim().toLowerCase() : "";
      const attempts = allScores.filter(s => normalize(s.topic) === normalize(topicTitle) && normalize(s.node_label) === normalize(nodeLabel));
      const hasPassed = attempts.some(s => s.quiz_score >= 6);
      const failCount = attempts.filter(s => s.quiz_score < 6).length;
      const isWeak = failCount >= 2; 
      return { isWeak, failCount, hasPassed };
  };

  const getProgress = (topicKey) => { /* ... existing code ... */
      const normalize = (str) => str ? str.trim().toLowerCase() : "";
      const mapData = userRoadmaps.find(r => normalize(r.topic) === topicKey);
      if (!mapData || !mapData.graph_data || !mapData.graph_data.nodes) return null;
      const nodes = mapData.graph_data.nodes; 
      const completedNodeLabels = new Set(allScores.filter(s => normalize(s.topic) === topicKey && s.quiz_score >= 6).map(s => s.node_label));
      const percentage = Math.round((completedNodeLabels.size / nodes.length) * 100);
      const currentNode = nodes.find(n => !completedNodeLabels.has(n.label));
      return { percentage, current: currentNode ? currentNode.label : "Completed! 🎉" };
  };

  const toggleFolder = (key) => setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  const handleLogout = async () => { await signOut(); navigate('/'); };
  const uniqueKeys = Object.keys(folders);

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Segoe UI' }}>
      
      {/* ... (Existing Header, Recommendations, and Tabs code) ... */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <button onClick={() => navigate(-1)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#555'}} title="Go Back"><FaArrowLeft/></button>
            <h1 style={{ margin: 0 }}>My Library</h1>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
          <div style={{marginBottom:'40px', padding:'25px', background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius:'15px', color:'white', boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}>
              <h2 style={{margin:'0 0 20px 0', display:'flex', alignItems:'center', gap:'10px', fontSize:'1.4rem'}}>
                  <FaUserFriends color="#FFD700"/> Students Like You Are Studying:
              </h2>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
                  {recommendations.map((rec, i) => (
                      <div key={i} style={{background:'rgba(255,255,255,0.95)', padding:'15px', borderRadius:'10px', color:'#333', display:'flex', flexDirection:'column', boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                              <span style={{fontSize:'0.75rem', fontWeight:'bold', textTransform:'uppercase', color:'#764ba2', background:'#f3e5f5', padding:'2px 8px', borderRadius:'4px'}}>{rec.topic}</span>
                              <div style={{fontSize:'0.8rem', color:'#555', display:'flex', alignItems:'center', gap:'4px'}}><FaFire color="#ff5722"/> {rec.count} students</div>
                          </div>
                          <div style={{fontWeight:'bold', marginBottom:'15px', fontSize:'1rem', flex:1, lineHeight:'1.4', display:'flex', alignItems:'start', gap:'8px'}}>
                              {rec.resource_type === 'video' ? <FaVideo color="#d32f2f" style={{marginTop:'3px'}}/> : <FaGlobe color="#28a745" style={{marginTop:'3px'}}/>}
                              {rec.title}
                          </div>
                          <div style={{display:'flex', gap:'10px', marginTop:'auto'}}>
                              <a href={rec.url} target="_blank" rel="noreferrer" style={{flex:1, padding:'10px', background:'#f0f2f5', textAlign:'center', borderRadius:'6px', textDecoration:'none', color:'#333', fontSize:'0.9rem', fontWeight:'bold', border:'1px solid #ddd'}}>View</a>
                              <button onClick={() => handleSaveRecommendation(rec)} style={{flex:1, padding:'10px', background:'#28a745', border:'none', borderRadius:'6px', color:'white', cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', fontSize:'0.9rem', fontWeight:'bold', boxShadow:'0 2px 5px rgba(40,167,69,0.3)'}}>
                                  <FaPlus/> Save
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex', gap:'20px', marginBottom:'30px', borderBottom:'1px solid #eee'}}>
          <button onClick={() => setActiveTab('library')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'library' ? '3px solid #007bff' : 'none', fontWeight:'bold', color: activeTab === 'library' ? '#007bff' : '#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}><FaBook/> My Library</button>
          <button onClick={() => setActiveTab('assessments')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'assessments' ? '3px solid #007bff' : 'none', fontWeight:'bold', color: activeTab === 'assessments' ? '#007bff' : '#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}><FaChartBar/> My Assessments</button>
      </div>

      {/* Folders List */}
      {loading ? <p>Loading...</p> : (
          activeTab === 'library' ? (
              uniqueKeys.length === 0 ? <div style={{textAlign:'center', padding:'50px', background:'#f9f9f9'}}><h3>No Saved Content 📂</h3></div> :
              <div>
                  {uniqueKeys.map(key => {
                      const folder = folders[key];
                      const progress = getProgress(key); 
                      return (
                          <div key={key} style={{ marginBottom: '20px', border: '1px solid #eee', borderRadius: '10px', overflow:'hidden' }}>
                              <div style={{ padding: '20px', background: '#f8f9fa', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  
                                  <div onClick={() => toggleFolder(key)} style={{display:'flex', flexDirection:'column', gap:'5px', flex:1, cursor:'pointer'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', fontWeight:'bold', fontSize:'1.1rem'}}>
                                        {expandedFolders[key] ? <FaFolderOpen color="#ffc107" size={24}/> : <FaFolder color="#ffc107" size={24}/>}
                                        <span style={{textTransform:'capitalize'}}>{folder.displayTitle}</span>
                                    </div>
                                    {progress && (
                                        <div style={{width:'100%', maxWidth:'400px', marginTop:'5px'}}>
                                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'#666', marginBottom:'2px'}}>
                                                <span>{progress.percentage}% Complete</span>
                                                <span style={{color:'#007bff', display:'flex', alignItems:'center', gap:'4px'}}><FaRunning/> Next: {progress.current}</span>
                                            </div>
                                            <div style={{width:'100%', height:'8px', background:'#e9ecef', borderRadius:'4px', overflow:'hidden'}}>
                                                <div style={{width: `${progress.percentage}%`, height:'100%', background: progress.percentage === 100 ? '#28a745' : '#007bff', transition:'width 0.5s ease'}}></div>
                                            </div>
                                        </div>
                                    )}
                                  </div>

                                  <span style={{color:'#999', marginRight:'10px'}}>{expandedFolders[key] ? <FaChevronDown/> : <FaChevronRight/>}</span>
                                  
                                  {/* ✅ DELETE BUTTON TRIGGERS MODAL */}
                                  {folder.hasRoadmap && (
                                    <button onClick={() => handleDeleteRoadmap(folder.displayTitle)} style={{background:'none', border:'none', cursor:'pointer', color:'#dc3545', padding:'10px'}}>
                                        <FaTrash size={18} />
                                    </button>
                                  )}
                              </div>

                              {expandedFolders[key] && (
                                  <div style={{ padding: '20px', background: 'white' }}>
                                      {folder.hasRoadmap && (
                                          <button onClick={() => navigate(`/roadmap/${folder.displayTitle}`)} style={{marginBottom:'20px', padding:'8px 15px', background:'#007bff', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem'}}>View Map 🗺️</button>
                                      )}

                                      {Object.keys(folder.subfolders).map(subNode => {
                                          const status = getNodeStatus(folder.displayTitle, subNode);
                                          return (
                                              <div key={subNode} style={{ marginLeft: '20px', marginBottom: '20px', paddingLeft: '15px', borderLeft: status.isWeak ? '4px solid #dc3545' : '3px solid #eee' }}>
                                                  <h4 style={{ margin: '0 0 10px 0', color: '#333', display:'flex', alignItems:'center', gap:'10px' }}>
                                                    {status.hasPassed ? <FaCheckCircle color="green"/> : <span style={{width:'16px'}}></span>}
                                                    {subNode}
                                                    {status.isWeak && (
                                                        <span style={{fontSize:'0.75rem', background:'#ffebee', color:'#c62828', padding:'4px 8px', borderRadius:'12px', border:'1px solid #ffcdd2', display:'flex', alignItems:'center', gap:'5px'}}>
                                                            <FaExclamationTriangle/> Weak Zone ({status.failCount} fails)
                                                        </span>
                                                    )}
                                                  </h4>
                                                  
                                                  {folder.subfolders[subNode].scores.map((s, i) => (
                                                      <div key={i} style={{display:'inline-flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                                                        <div style={{display:'inline-block', padding:'5px 10px', background: s.quiz_score >=6 ? '#e8f5e9' : '#fff3cd', color: s.quiz_score >=6 ? 'green' : '#856404', borderRadius:'15px', fontSize:'0.8rem'}}>
                                                            <FaStar/> Score: {s.quiz_score}/10
                                                        </div>
                                                        <button onClick={() => handleRetake(folder.displayTitle, subNode)} style={{padding:'2px 8px', fontSize:'0.8rem', cursor:'pointer', border:'1px solid #ccc', borderRadius:'5px', background:'white', display:'flex', alignItems:'center', gap:'4px'}}>
                                                            <FaRedo size={10}/> Retake
                                                        </button>
                                                      </div>
                                                  ))}

                                                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px'}}>
                                                      {folder.subfolders[subNode].resources.map(res => (
                                                          <div key={res.id} style={{position:'relative', display:'flex', alignItems:'center', gap:'10px', padding:'10px', background:'white', border:'1px solid #eee', borderRadius:'8px'}}>
                                                              <a href={res.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'8px', flex:1, overflow:'hidden'}}>
                                                                  {res.resource_type === 'video' ? <FaVideo color="#d32f2f"/> : res.resource_type === 'article' ? <FaGlobe color="#28a745"/> : <FaFilePdf color="#ffc107"/>}
                                                                  <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{res.title}</span>
                                                              </a>
                                                              {/* ✅ DELETE RESOURCE TRIGGERS MODAL */}
                                                              <button onClick={() => handleDeleteResource(res.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:'0 5px'}}>
                                                                  <FaTrash size={12}/>
                                                              </button>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          ) : (
              // ASSESSMENTS TAB
              <div>
                  {allScores.length === 0 ? <p>No assessments taken yet.</p> : (
                      <div style={{display:'grid', gap:'15px'}}>
                          {allScores.map(score => (
                              <div key={score.id} style={{padding:'20px', border:'1px solid #eee', borderRadius:'10px', background:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <div>
                                      <h3 style={{margin:'0 0 5px 0'}}>{score.node_label}</h3>
                                      <span style={{fontSize:'0.9rem', color:'#666', background:'#f0f0f0', padding:'2px 8px', borderRadius:'4px'}}>{score.topic || "Unknown Topic"}</span>
                                  </div>
                                  <div style={{textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px'}}>
                                      <h2 style={{margin:0, color: score.quiz_score >=6 ? 'green' : 'orange'}}>{score.quiz_score}/10</h2>
                                      
                                      <button onClick={() => handleRetake(score.topic, score.node_label)} style={{padding:'5px 15px', background:'#007bff', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'5px'}}>
                                          <FaRedo/> Retake
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )
      )}

      {/* ✅ CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={deleteConfirm.show}
        title={`Delete "${deleteConfirm.title}"?`}
        message="Are you sure you want to delete this? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, show: false }))}
      />

      {/* Quiz Modal */}
      {showQuiz && activeQuizData && (
          <AssessmentModal 
            mainTopic={activeQuizData.mainTopic} 
            subTopic={activeQuizData.subTopic}
            questionCount={10} 
            onClose={() => setShowQuiz(false)}
            onComplete={handleQuizComplete}
          />
      )}
    </div>
  );
}

export default ProfilePage;