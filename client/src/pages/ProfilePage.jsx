import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// Added FaExclamationTriangle for the warning icon
import { FaFolder, FaFolderOpen, FaArrowLeft, FaVideo, FaFilePdf, FaStar, FaChevronRight, FaChevronDown, FaChartBar, FaBook, FaGlobe, FaTrash, FaCheckCircle, FaRunning, FaRedo, FaExclamationTriangle } from 'react-icons/fa';
import AssessmentModal from '../components/AssessmentModal';

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [folders, setFolders] = useState({});
  const [allScores, setAllScores] = useState([]);
  const [userRoadmaps, setUserRoadmaps] = useState([]); 
  const [expandedFolders, setExpandedFolders] = useState({});
  const [activeTab, setActiveTab] = useState('library');
  const [loading, setLoading] = useState(true);

  // --- QUIZ STATE ---
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeQuizData, setActiveQuizData] = useState(null);

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
        setUserRoadmaps(roadmaps.data || []);

        const grouped = {};
        
        // 1. Folders (Roadmaps) - Normalize Logic
        const normalize = (str) => str ? str.trim().toLowerCase() : "unknown";

        roadmaps.data?.forEach(r => {
            const key = normalize(r.topic); 
            if (!grouped[key]) grouped[key] = { displayTitle: r.topic, hasRoadmap: true, subfolders: {} };
            else grouped[key].hasRoadmap = true;
        });

        // 2. Resources
        resources.data?.forEach(r => {
            const key = normalize(r.roadmap_topic);
            if (!grouped[key]) grouped[key] = { displayTitle: r.roadmap_topic, hasRoadmap: false, subfolders: {} };
            if (!grouped[key].subfolders[r.node_label]) {
                grouped[key].subfolders[r.node_label] = { resources: [], scores: [] };
            }
            grouped[key].subfolders[r.node_label].resources.push(r);
        });

        // 3. Scores
        scores.data?.forEach(s => {
            const key = normalize(s.topic); 
            if (key) {
                if (!grouped[key]) grouped[key] = { displayTitle: s.topic, hasRoadmap: false, subfolders: {} };
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

  // --- NEW: WEAKNESS DETECTOR LOGIC ---
  const getNodeStatus = (topicTitle, nodeLabel) => {
      const normalize = (str) => str ? str.trim().toLowerCase() : "";
      
      // Filter scores for this specific node
      const attempts = allScores.filter(s => 
          normalize(s.topic) === normalize(topicTitle) && 
          normalize(s.node_label) === normalize(nodeLabel)
      );

      // Check if they ever passed (Score >= 6)
      const hasPassed = attempts.some(s => s.quiz_score >= 6);
      
      // Count failures (Score < 6)
      const failCount = attempts.filter(s => s.quiz_score < 6).length;

      // DEFINITION OF WEAK ZONE: Not passed yet AND failed 2+ times
      const isWeak = !hasPassed && failCount >= 2;

      return { isWeak, failCount, hasPassed };
  };

  const handleRetake = (mainTopic, subTopic) => {
      setActiveQuizData({ mainTopic, subTopic });
      setShowQuiz(true);
  };

  const handleQuizComplete = async (score, feedback) => {
      setShowQuiz(false);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/submit_progress`, {
            user_id: user.id,
            topic: activeQuizData.mainTopic,
            node_label: activeQuizData.subTopic,
            score: score,
            feedback: feedback
        });
        alert(`Score Saved: ${score}/10`);
        fetchData(); 
      } catch(e) { console.error(e); }
  };

  const handleDeleteRoadmap = async (topic) => {
    if(!window.confirm(`Delete "${topic}"?`)) return;
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.delete(`${baseUrl}/api/delete_roadmap?user_id=${user.id}&topic=${topic}`);
        fetchData(); 
    } catch(e) { alert("Error deleting roadmap"); }
  };

  const handleDeleteResource = async (id) => {
    if(!window.confirm("Delete this resource?")) return;
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.delete(`${baseUrl}/api/delete_resource?id=${id}`);
        fetchData(); 
    } catch(e) { alert("Error deleting resource"); }
  };

  const uniqueTopics = Object.keys(folders);

  const getProgress = (topicKey) => {
      const normalize = (str) => str ? str.trim().toLowerCase() : "";
      
      // Find raw map data matching the key
      const mapData = userRoadmaps.find(r => normalize(r.topic) === topicKey);
      
      if (!mapData || !mapData.graph_data || !mapData.graph_data.nodes) return null;

      const nodes = mapData.graph_data.nodes; 
      const total = nodes.length;
      
      const completedNodeLabels = new Set(
          allScores.filter(s => normalize(s.topic) === topicKey && s.quiz_score >= 6).map(s => s.node_label)
      );
      const completedCount = completedNodeLabels.size;
      const percentage = Math.round((completedCount / total) * 100);
      const currentNode = nodes.find(n => !completedNodeLabels.has(n.label));
      
      return { total, completed: completedCount, percentage, current: currentNode ? currentNode.label : "Completed! 🎉" };
  };

  const toggleFolder = (topic) => setExpandedFolders(prev => ({ ...prev, [topic]: !prev[topic] }));
  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Segoe UI' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <button onClick={() => navigate(-1)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#555'}} title="Go Back"><FaArrowLeft/></button>
            <h1 style={{ margin: 0 }}>My Library</h1>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{display:'flex', gap:'20px', marginBottom:'30px', borderBottom:'1px solid #eee'}}>
          <button onClick={() => setActiveTab('library')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'library' ? '3px solid #007bff' : 'none', fontWeight:'bold', color: activeTab === 'library' ? '#007bff' : '#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}><FaBook/> My Library</button>
          <button onClick={() => setActiveTab('assessments')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'assessments' ? '3px solid #007bff' : 'none', fontWeight:'bold', color: activeTab === 'assessments' ? '#007bff' : '#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}><FaChartBar/> My Assessments</button>
      </div>

      {loading ? <p>Loading...</p> : (
          activeTab === 'library' ? (
              uniqueTopics.length === 0 ? <div style={{textAlign:'center', padding:'50px', background:'#f9f9f9'}}><h3>No Saved Content 📂</h3></div> :
              <div>
                  {uniqueTopics.map(key => {
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
                                          // CHECK STATUS FOR WEAKNESS
                                          const status = getNodeStatus(folder.displayTitle, subNode);

                                          return (
                                              <div key={subNode} style={{ marginLeft: '20px', marginBottom: '20px', paddingLeft: '15px', borderLeft: status.isWeak ? '4px solid #dc3545' : '3px solid #eee' }}>
                                                  <h4 style={{ margin: '0 0 10px 0', color: '#333', display:'flex', alignItems:'center', gap:'10px' }}>
                                                    {status.hasPassed ? <FaCheckCircle color="green"/> : <span style={{width:'16px'}}></span>}
                                                    {subNode}
                                                    
                                                    {/* WEAK ZONE BADGE */}
                                                    {status.isWeak && (
                                                        <span style={{fontSize:'0.75rem', background:'#ffebee', color:'#c62828', padding:'4px 8px', borderRadius:'12px', border:'1px solid #ffcdd2', display:'flex', alignItems:'center', gap:'5px'}}>
                                                            <FaExclamationTriangle/> Weak Zone ({status.failCount} fails)
                                                        </span>
                                                    )}
                                                  </h4>
                                                  
                                                  {/* SCORES + RETAKE */}
                                                  {folder.subfolders[subNode].scores.map((s, i) => (
                                                      <div key={i} style={{display:'inline-flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                                                        <div style={{display:'inline-block', padding:'5px 10px', background: s.quiz_score >=6 ? '#e8f5e9' : '#fff3cd', color: s.quiz_score >=6 ? 'green' : '#856404', borderRadius:'15px', fontSize:'0.8rem'}}>
                                                            <FaStar/> Score: {s.quiz_score}/10
                                                        </div>
                                                        {s.quiz_score < 6 && (
                                                            <button onClick={() => handleRetake(folder.displayTitle, subNode)} style={{padding:'2px 8px', fontSize:'0.8rem', cursor:'pointer', border:'1px solid #ccc', borderRadius:'5px', background:'white', display:'flex', alignItems:'center', gap:'4px'}}>
                                                                <FaRedo size={10}/> Retake
                                                            </button>
                                                        )}
                                                      </div>
                                                  ))}

                                                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px'}}>
                                                      {folder.subfolders[subNode].resources.map(res => (
                                                          <div key={res.id} style={{position:'relative', display:'flex', alignItems:'center', gap:'10px', padding:'10px', background:'white', border:'1px solid #eee', borderRadius:'8px'}}>
                                                              <a href={res.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'8px', flex:1, overflow:'hidden'}}>
                                                                  {res.resource_type === 'video' ? <FaVideo color="#d32f2f"/> : res.resource_type === 'article' ? <FaGlobe color="#28a745"/> : <FaFilePdf color="#ffc107"/>}
                                                                  <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{res.title}</span>
                                                              </a>
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