import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaFolder, FaFolderOpen, FaArrowLeft, FaVideo, FaFilePdf, FaStar, FaChevronRight, FaChevronDown, FaChartBar, FaBook, FaGlobe, FaTrash, FaCheckCircle, FaRunning, FaRedo, FaExclamationTriangle, FaUserFriends, FaFire, FaPlus } from 'react-icons/fa';
import AssessmentModal from '../components/AssessmentModal';
import ConfirmationModal from '../components/ConfirmationModal';
import FlashcardModal from '../components/FlashcardModal'; 
import Navbar from '../components/Navbar'; 
import useMobile from '../hooks/useMobile';

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile(); 
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Scholar";

  const [folders, setFolders] = useState({});
  const [allScores, setAllScores] = useState([]);
  const [userRoadmaps, setUserRoadmaps] = useState([]); 
  const [expandedFolders, setExpandedFolders] = useState({});
  const [activeTab, setActiveTab] = useState('library');
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  
  const [dueFlashcards, setDueFlashcards] = useState([]);
  const [showFlashcards, setShowFlashcards] = useState(false);

  const [showQuiz, setShowQuiz] = useState(false);
  const [activeQuizData, setActiveQuizData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, title: '' });

  useEffect(() => {
    if (user) {
        fetchData();
        fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const res = await axios.get(`${baseUrl}/api/recommendations?user_id=${user.id}`);
        setRecommendations(res.data);
      } catch (e) { console.error("Rec Error", e); }
  };

  const handleSaveRecommendation = async (rec) => {
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

  const fetchData = async () => {
    setLoading(true);
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const roadmaps = await supabase.from('user_roadmaps').select('*').eq('user_id', user.id);
        const resources = await supabase.from('saved_resources').select('*').eq('user_id', user.id);
        const scores = await supabase.from('node_progress').select('*').eq('user_id', user.id).order('created_at', {ascending: false});

        const fcRes = await axios.get(`${baseUrl}/api/flashcards/due?user_id=${user.id}`);
        setDueFlashcards(fcRes.data);

        setAllScores(scores.data || []);
        setUserRoadmaps(roadmaps.data || []);

        const grouped = {};
        const normalize = (str) => str ? str.trim().toLowerCase() : "unknown";

        roadmaps.data?.forEach(r => {
            const key = normalize(r.topic); 
            if (!grouped[key]) {
                grouped[key] = { displayTitle: r.topic, roadmaps: [], resourcesCount: 0, subfolders: {} };
            }
            grouped[key].roadmaps.push(r);
        });

        resources.data?.forEach(r => {
            const key = normalize(r.roadmap_topic);
            if (!grouped[key]) grouped[key] = { displayTitle: r.roadmap_topic, roadmaps: [], resourcesCount: 0, subfolders: {} };
            
            grouped[key].resourcesCount += 1;
            
            if (!grouped[key].subfolders[r.node_label]) grouped[key].subfolders[r.node_label] = { resources: [], scores: [] };
            grouped[key].subfolders[r.node_label].resources.push(r);
        });

        scores.data?.forEach(s => {
            const key = normalize(s.topic); 
            if (key) {
                if (!grouped[key]) grouped[key] = { displayTitle: s.topic, roadmaps: [], resourcesCount: 0, subfolders: {} };
                if (!grouped[key].subfolders[s.node_label]) grouped[key].subfolders[s.node_label] = { resources: [], scores: [] };
                grouped[key].subfolders[s.node_label].scores.push(s);
            }
        });
        setFolders(grouped);
    } catch (error) { console.error("Error:", error); } 
    finally { setLoading(false); }
  };

  const handleReviewUpdate = async (cardId, quality, currentInterval) => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
      await axios.post(`${baseUrl}/api/flashcards/review`, {
          card_id: cardId, quality, current_interval: currentInterval
      });
      setDueFlashcards(prev => prev.filter(c => c.id !== cardId));
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
            username: user.user_metadata?.full_name || user.email.split('@')[0], 
            topic: activeQuizData.mainTopic, 
            node_label: activeQuizData.subTopic, 
            score: score, 
            feedback: feedback
        });
        alert(`Score Saved: ${score}/10`);
        fetchData(); 
      } catch(e) { console.error(e); }
  };
  
  const handleDeleteRoadmap = (id, topic, mode) => { setDeleteConfirm({ show: true, type: 'roadmap', id: id, title: `${mode} roadmap for ${topic}` }); };
  const handleDeleteResource = (id) => { setDeleteConfirm({ show: true, type: 'resource', id: id, title: 'this resource' }); };

  const executeDelete = async () => {
      setDeleteConfirm(prev => ({ ...prev, show: false }));
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
          if (deleteConfirm.type === 'roadmap') {
              await supabase.from('user_roadmaps').delete().eq('id', deleteConfirm.id);
          } else {
              await axios.delete(`${baseUrl}/api/delete_resource?id=${deleteConfirm.id}`);
          }
          fetchData(); 
      } catch(e) { alert("Error deleting."); }
  };

  const getNodeStatus = (topicTitle, nodeLabel) => {
      const normalize = (str) => str ? str.trim().toLowerCase() : "";
      const attempts = allScores.filter(s => normalize(s.topic) === normalize(topicTitle) && normalize(s.node_label) === normalize(nodeLabel));
      const hasPassed = attempts.some(s => s.quiz_score >= 6);
      const failCount = attempts.filter(s => s.quiz_score < 6).length;
      return { isWeak: failCount >= 2, failCount, hasPassed };
  };

  const getProgress = (topicKey, nodes) => {
      const normalize = (str) => str ? str.trim().toLowerCase() : "";
      if (!nodes || nodes.length === 0) return null;
      
      const completedNodeLabels = new Set(allScores.filter(s => normalize(s.topic) === topicKey && s.quiz_score >= 6).map(s => s.node_label));
      const percentage = Math.round((completedNodeLabels.size / nodes.length) * 100);
      const currentNode = nodes.find(n => !completedNodeLabels.has(n.label));
      return { percentage: Math.min(percentage, 100), current: currentNode ? currentNode.label : "Completed! 🎉" };
  };

  const toggleFolder = (key) => setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  const uniqueKeys = Object.keys(folders);

  const totalScore = allScores.reduce((acc, curr) => acc + (curr.quiz_score || 0), 0);
  const getRank = (score) => {
      if (score > 150) return { title: "Tech Wizard", icon: "🧙‍♂️", color: "#9c27b0" };
      if (score > 50) return { title: "Code Warrior", icon: "⚔️", color: "#ff9800" };
      return { title: "Novice Scholar", icon: "🛡️", color: "var(--accent-blue)" };
  };
  const rank = getRank(totalScore);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'transparent', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ width: '100%', position: 'sticky', top: 0, zIndex: 100 }}>
        <Navbar />
      </div>

      <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '1000px', width: '100%', margin: '0 auto', fontFamily: 'Segoe UI', flex: 1 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '30px' }}>
          <button onClick={() => navigate(-1)} style={{background:'none', border:'none', fontSize:'1rem', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'5px', alignSelf:'flex-start', marginBottom:'10px'}} title="Go Back">
            <FaArrowLeft/> Back
          </button>
          
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
             <h1 style={{ margin: 0, fontSize: isMobile ? '2rem' : '2.5rem', background: 'linear-gradient(90deg, #00c6ff, #0072ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                👋 Hi, {userName}!
             </h1>
             <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                <div style={{ padding: '5px 15px', background: rank.color, color: 'white', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '5px', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                    <span style={{fontSize: '1.2rem'}}>{rank.icon}</span> {rank.title} (Lvl {Math.floor(totalScore / 10)})
                </div>
                <div style={{ padding: '5px 15px', background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', border: '1px solid #ffc107', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 0 10px rgba(255, 193, 7, 0.2)' }}>
                    ⭐ {totalScore} Points
                </div>
             </div>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '5px', fontSize: '1.1rem' }}>Welcome back to your personal library.</p>
        </div>

        {/* FLASHCARDS ALERT */}
        {dueFlashcards.length > 0 && (
            <div style={{
                background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)', 
                padding: '20px', borderRadius: '15px', marginBottom: '30px', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white',
                boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
            }}>
                <div>
                    <h3 style={{margin:0, fontSize:'1.5rem', display:'flex', alignItems:'center', gap:'10px'}}>
                        <FaFire/> Daily Review
                    </h3>
                    <p style={{margin:'5px 0 0 0', opacity:0.9}}>You have {dueFlashcards.length} cards due for review.</p>
                </div>
                <button onClick={() => setShowFlashcards(true)} style={{
                    background: 'white', color: '#FF6B6B', border: 'none', padding: '10px 25px', 
                    borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}>
                    Start Review
                </button>
            </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
            <div style={{marginBottom:'40px', padding: isMobile ? '15px' : '25px', background: 'var(--card-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--card-border)', borderRadius:'15px', color:'var(--text-main)', boxShadow:'0 4px 15px rgba(0,0,0,0.05)'}}>
                <h2 style={{margin:'0 0 20px 0', display:'flex', alignItems:'center', gap:'10px', fontSize:'1.4rem'}}>
                    <FaUserFriends color="#FFD700"/> Recommended for You:
                </h2>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
                    {recommendations.map((rec, i) => (
                        <div key={i} style={{background:'var(--card-hover)', border: '1px solid var(--card-border)', padding:'15px', borderRadius:'10px', color:'var(--text-main)', display:'flex', flexDirection:'column'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                                <span style={{fontSize:'0.75rem', fontWeight:'bold', textTransform:'uppercase', color:'var(--accent-blue)', background:'rgba(0, 123, 255, 0.1)', padding:'2px 8px', borderRadius:'4px'}}>{rec.topic}</span>
                                <div style={{fontSize:'0.8rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'4px'}}><FaFire color="var(--accent-red)"/> {rec.count} peers</div>
                            </div>
                            <div style={{fontWeight:'bold', marginBottom:'15px', fontSize:'1rem', flex:1, lineHeight:'1.4', display:'flex', alignItems:'start', gap:'8px'}}>
                                {rec.resource_type === 'video' ? <FaVideo color="var(--accent-red)" style={{marginTop:'3px'}}/> : <FaGlobe color="var(--accent-green)" style={{marginTop:'3px'}}/>}
                                {rec.title}
                            </div>
                            <div style={{display:'flex', gap:'10px', marginTop:'auto'}}>
                                <a href={rec.url} target="_blank" rel="noreferrer" style={{flex:1, padding:'10px', background:'var(--card-border)', textAlign:'center', borderRadius:'6px', textDecoration:'none', color:'var(--text-main)', fontSize:'0.9rem', fontWeight:'bold'}}>View</a>
                                <button onClick={() => handleSaveRecommendation(rec)} style={{flex:1, padding:'10px', background:'var(--accent-green)', border:'none', borderRadius:'6px', color:'white', cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', fontSize:'0.9rem', fontWeight:'bold'}}>
                                    <FaPlus/> Save
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex', gap:'20px', marginBottom:'30px', borderBottom:'1px solid var(--card-border)', overflowX: 'auto'}}>
            <button onClick={() => setActiveTab('library')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'library' ? '3px solid var(--accent-blue)' : 'none', fontWeight:'bold', color: activeTab === 'library' ? 'var(--accent-blue)' : 'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap'}}><FaBook/> My Library</button>
            <button onClick={() => setActiveTab('assessments')} style={{padding:'10px 20px', background:'none', border:'none', borderBottom: activeTab === 'assessments' ? '3px solid var(--accent-blue)' : 'none', fontWeight:'bold', color: activeTab === 'assessments' ? 'var(--accent-blue)' : 'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap'}}><FaChartBar/> My Assessments</button>
        </div>

        {/* Folders List */}
        {loading ? <div className="spinner"></div> : (
            activeTab === 'library' ? (
                uniqueKeys.length === 0 ? <div style={{textAlign:'center', padding:'50px', color:'var(--text-muted)'}}><h3>No Saved Content 📂</h3></div> :
                <div>
                    {uniqueKeys.map(key => {
                        const folder = folders[key];
                        return (
                            <div key={key} style={{ marginBottom: '20px', background: 'var(--card-bg)', borderRadius: '10px', overflow:'hidden', border:'1px solid var(--card-border)' }}>
                                <div style={{ padding: '20px', background: 'var(--card-hover)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div onClick={() => toggleFolder(key)} style={{display:'flex', flexDirection:'column', gap:'5px', flex:1, cursor:'pointer'}}>
                                      <div style={{display:'flex', alignItems:'center', gap:'10px', fontWeight:'bold', fontSize:'1.1rem'}}>
                                          {expandedFolders[key] ? <FaFolderOpen color="#ffc107" size={24}/> : <FaFolder color="#ffc107" size={24}/>}
                                          <span style={{textTransform:'capitalize'}}>{folder.displayTitle}</span>
                                          <span style={{fontSize:'0.8rem', color:'var(--text-muted)', background:'var(--card-border)', padding:'2px 8px', borderRadius:'10px'}}>{folder.roadmaps.length} Maps • {folder.resourcesCount} Items</span>
                                      </div>
                                    </div>
                                    <span style={{color:'var(--text-muted)', marginRight:'10px'}}>{expandedFolders[key] ? <FaChevronDown/> : <FaChevronRight/>}</span>
                                </div>

                                {expandedFolders[key] && (
                                    <div style={{ padding: '20px', background: 'var(--bg-solid)' }}>
                                        
                                        {folder.roadmaps.length > 0 && (
                                            <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'25px'}}>
                                                {folder.roadmaps.map(rm => {
                                                    const progress = getProgress(key, rm.graph_data?.nodes);
                                                    const isPanic = rm.mode === 'panic';
                                                    
                                                    return (
                                                    <div key={rm.id} style={{
                                                        background: 'var(--card-bg)', border: `1px solid ${isPanic ? 'var(--accent-red)' : 'var(--accent-blue)'}`, 
                                                        borderRadius: '8px', padding: '15px', flex: '1 1 300px', display:'flex', flexDirection:'column', gap:'10px'
                                                    }}>
                                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                            <div style={{
                                                                background: isPanic ? 'rgba(220, 53, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                                                                color: isPanic ? 'var(--accent-red)' : 'var(--accent-blue)',
                                                                padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold'
                                                            }}>
                                                                {isPanic ? '🚨 Panic Mode' : '📚 Regular Mode'}
                                                            </div>
                                                            <button onClick={() => handleDeleteRoadmap(rm.id, folder.displayTitle, rm.mode)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--accent-red)'}}>
                                                                <FaTrash size={14} />
                                                            </button>
                                                        </div>
                                                        
                                                        {progress && (
                                                            <div style={{width:'100%', marginTop:'5px'}}>
                                                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'4px'}}>
                                                                    <span>{progress.percentage}% Complete</span>
                                                                    <span style={{color: isPanic ? 'var(--accent-red)' : 'var(--accent-blue)', display:'flex', alignItems:'center', gap:'4px'}}><FaRunning/> Next: {progress.current}</span>
                                                                </div>
                                                                <div style={{width:'100%', height:'6px', background:'var(--card-border)', borderRadius:'3px', overflow:'hidden'}}>
                                                                    <div style={{width: `${progress.percentage}%`, height:'100%', background: progress.percentage === 100 ? 'var(--accent-green)' : (isPanic ? 'var(--accent-red)' : 'var(--accent-blue)'), transition:'width 0.5s ease'}}></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <button onClick={() => navigate(`/roadmap/${folder.displayTitle}?mode=${rm.mode}`)} style={{marginTop:'auto', padding:'8px', background: isPanic ? 'var(--accent-red)' : 'var(--accent-blue)', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'bold'}}>
                                                            Open Map 🗺️
                                                        </button>
                                                    </div>
                                                )})}
                                            </div>
                                        )}

                                        {Object.keys(folder.subfolders).map(subNode => {
                                            const status = getNodeStatus(folder.displayTitle, subNode);
                                            return (
                                                <div key={subNode} style={{ marginLeft: isMobile ? '0' : '20px', marginBottom: '20px', paddingLeft: '15px', borderLeft: status.isWeak ? '4px solid var(--accent-red)' : '3px solid var(--card-border)' }}>
                                                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px' }}>
                                                        {status.hasPassed ? <FaCheckCircle color="var(--accent-green)"/> : <span style={{width:'16px'}}></span>}
                                                        {subNode}
                                                        {status.isWeak && (
                                                            <span style={{fontSize:'0.75rem', background:'rgba(220, 53, 69, 0.1)', color:'var(--accent-red)', padding:'4px 8px', borderRadius:'12px', border:'1px solid rgba(220, 53, 69, 0.2)', display:'flex', alignItems:'center', gap:'5px'}}>
                                                                <FaExclamationTriangle/> Weak Zone
                                                            </span>
                                                        )}
                                                    </h4>
                                                    
                                                    {folder.subfolders[subNode].scores.map((s, i) => (
                                                        <div key={i} style={{display:'inline-flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                                                            <div style={{display:'inline-block', padding:'5px 10px', background: s.quiz_score >=6 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)', color: s.quiz_score >=6 ? 'var(--accent-green)' : '#ffc107', borderRadius:'15px', fontSize:'0.8rem', border: s.quiz_score>=6?'1px solid rgba(40,167,69,0.2)':'1px solid rgba(255,193,7,0.2)'}}>
                                                                <FaStar/> Score: {s.quiz_score}/10
                                                            </div>
                                                            <button onClick={() => handleRetake(folder.displayTitle, subNode)} style={{padding:'2px 8px', fontSize:'0.8rem', cursor:'pointer', border:'1px solid var(--card-border)', borderRadius:'5px', background:'var(--card-bg)', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'4px'}}>
                                                                <FaRedo size={10}/> Retake
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px'}}>
                                                        {folder.subfolders[subNode].resources.map(res => (
                                                            <div key={res.id} style={{position:'relative', display:'flex', alignItems:'center', gap:'10px', padding:'10px', background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:'8px'}}>
                                                                <a href={res.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'var(--text-main)', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'8px', flex:1, overflow:'hidden'}}>
                                                                    {res.resource_type === 'video' ? <FaVideo color="var(--accent-red)"/> : res.resource_type === 'article' ? <FaGlobe color="var(--accent-green)"/> : <FaFilePdf color="#ffc107"/>}
                                                                    <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{res.title}</span>
                                                                </a>
                                                                <button onClick={() => handleDeleteResource(res.id)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'0 5px'}}>
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
                    {allScores.length === 0 ? <p style={{color:'var(--text-muted)'}}>No assessments taken yet.</p> : (
                        <div style={{display:'grid', gap:'15px'}}>
                            {allScores.map(score => (
                                <div key={score.id} style={{padding:'20px', border:'1px solid var(--card-border)', borderRadius:'10px', background:'var(--card-bg)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <div>
                                        <h3 style={{margin:'0 0 5px 0', color:'var(--text-main)'}}>{score.node_label}</h3>
                                        <span style={{fontSize:'0.9rem', color:'var(--text-muted)', background:'var(--card-hover)', padding:'2px 8px', borderRadius:'4px'}}>{score.topic || "Unknown Topic"}</span>
                                    </div>
                                    <div style={{textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px'}}>
                                            <h2 style={{margin:0, color: score.quiz_score >=6 ? 'var(--accent-green)' : '#ffc107'}}>{score.quiz_score}/10</h2>
                                            
                                            <button onClick={() => handleRetake(score.topic, score.node_label)} style={{padding:'5px 15px', background:'var(--accent-blue)', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'5px'}}>
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
      </div>

      <ConfirmationModal 
        isOpen={deleteConfirm.show}
        title={deleteConfirm.title}
        message="Are you sure you want to delete this? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, show: false }))}
      />

      {showQuiz && activeQuizData && (
          <AssessmentModal 
            mainTopic={activeQuizData.mainTopic} 
            subTopic={activeQuizData.subTopic}
            questionCount={10} 
            onClose={() => setShowQuiz(false)}
            onComplete={handleQuizComplete}
          />
      )}

      {showFlashcards && dueFlashcards.length > 0 && (
          <FlashcardModal 
            cards={dueFlashcards} 
            onClose={() => setShowFlashcards(false)} 
            onReviewUpdate={handleReviewUpdate}
          />
      )}

      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ProfilePage;