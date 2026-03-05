import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight, FaArrowLeft, FaPlayCircle, FaFilePdf, FaSave, FaGlobe, FaCheckCircle, FaLock, FaGraduationCap, FaArrowDown, FaRobot } from 'react-icons/fa';
import AssessmentModal from '../components/AssessmentModal';
import KnowledgeCheckModal from '../components/KnowledgeCheckModal';
import NodeChatModal from '../components/NodeChatModal'; 
import CelebrationModal from '../components/CelebrationModal'; // ✅ IMPORTED CELEBRATION
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase'; 
import useMobile from '../hooks/useMobile';

function RoadmapGraph() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { topic } = useParams();
  const isMobile = useMobile(); 
  
  const [nodes, setNodes] = useState([]);
  const [flashcards, setFlashcards] = useState([]); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [resources, setResources] = useState({ videos: [], articles: [], pdfs: [], trust_score: null, review_count: 0 });
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const [progress, setProgress] = useState(0);

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [quizType, setQuizType] = useState('full'); 
  const [checkNode, setCheckNode] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loadingResources, setLoadingResources] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  
  // ✅ ADDED CELEBRATION STATE
  const [celebration, setCelebration] = useState({ show: false, title: '', subtitle: '', type: 'node' });

  const mapFetched = useRef(false);
  const resourcesRef = useRef(null); 

  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') || 'standard';

  useEffect(() => {
    if (mapFetched.current === topic + location.search) return;
    const init = async () => {
        mapFetched.current = topic + location.search;
        setMapLoading(true);
        
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
            const userQuery = user ? `&user_id=${user.id}` : '';
            const res = await axios.get(`${baseUrl}/api/roadmap?topic=${topic}&mode=${mode}${userQuery}`);
            const data = res.data;
            if (data && data.nodes) setNodes(data.nodes);
            else setNodes([{id:'1', label:`${topic} Basics`}]);
            
            if (data.flashcards) setFlashcards(data.flashcards);

            if (mode === 'panic') showNotification("🚨 Panic Mode: Crash Course Activated!", "error");
        } catch(e) { console.error(e); }

        if (user) {
            const { data } = await supabase.from('node_progress').select('node_label, quiz_score').eq('user_id', user.id).eq('topic', topic);
            if (data) {
                const passedNodes = data.filter(d => d.quiz_score >= 3).map(d => d.node_label);
                setCompletedNodes(new Set(passedNodes));
            }
        }
        setMapLoading(false);
    };
    init();
  }, [topic, user, location.search]);

  useEffect(() => {
      if (nodes.length > 0) {
          const percent = Math.round((completedNodes.size / nodes.length) * 100);
          setProgress(percent);
      }
  }, [nodes, completedNodes]);

  const showNotification = (msg, type='success') => { setToast({ show: true, message: msg, type }); };

  const handleSaveRoadmap = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_roadmap`, { 
            user_id: user.id, topic: topic, mode: mode, graph_data: { nodes: nodes }, flashcards: flashcards 
        });
        showNotification(`${mode === 'panic' ? '🚨 Panic' : '📚 Regular'} Roadmap saved!`);
    } catch (e) { 
        if (e.response && e.response.status === 409) {
            showNotification(`⚠️ You already have this ${mode} roadmap in your profile.`, "error");
        } else {
            showNotification("Error saving roadmap", "error"); 
        }
    }
  };

  const handleSaveResource = async (item, type) => {
    if (!user) return showNotification("Login required to save", "error");
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_resource`, {
            user_id: user.id, roadmap_topic: topic, node_label: selectedNode.label, resource_type: type, title: item.title, url: item.url, thumbnail: item.thumbnail || ''
        });
        showNotification("Resource added to Library! 📚");
    } catch(e) { showNotification("Error saving resource", "error"); }
  };

  const handleNodeClick = (node, index) => {
    if (index > 0 && !completedNodes.has(nodes[index - 1].label)) { showNotification("🔒 Complete previous module first!", "error"); return; }
    setCheckNode(node); setShowCheckModal(true); 
  };

  const handleKnowsTopic = () => { setShowCheckModal(false); setQuizType('diagnostic'); setShowQuizModal(true); };
  const handleNewTopic = () => { setShowCheckModal(false); fetchResources(checkNode); };
  const handleStartFullAssessment = () => { setQuizType('full'); setShowQuizModal(true); };
  const handleUpgradeToFull = () => { setQuizType('full'); };

  const handleQuizComplete = (score, feedback) => {
    setShowQuizModal(false);
    
    if(user) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        axios.post(`${baseUrl}/api/submit_progress`, { 
            user_id: user.id, 
            username: user.user_metadata?.full_name || user.email.split('@')[0],
            topic: topic, 
            node_label: checkNode.label, 
            score: score, 
            feedback: feedback 
        }).catch(e => console.error("Progress save error:", e));
    }
    
    let passed = quizType === 'diagnostic' ? score >= 3 : score >= 6; 
    
    if (passed) {
        // Track if this was already passed so we don't trigger the big course completion multiple times
        const isAlreadyCompleted = completedNodes.has(checkNode.label);
        setCompletedNodes(prev => new Set(prev).add(checkNode.label));

        // ✅ TRIGGER DYNAMIC CELEBRATION
        const newCompletedCount = isAlreadyCompleted ? completedNodes.size : completedNodes.size + 1;
        
        if (newCompletedCount === nodes.length && !isAlreadyCompleted) {
            setCelebration({ show: true, title: 'Path Conquered! 🏆', subtitle: `You have completely mastered ${topic}!`, type: 'course' });
        } else if (quizType === 'diagnostic') {
            setCelebration({ show: true, title: 'Fast Track! ⚡', subtitle: `You already know ${checkNode.label}. Moving on!`, type: 'node' });
        } else {
            setCelebration({ show: true, title: 'Module Passed! 🌟', subtitle: `Great job mastering ${checkNode.label}. Keep it up!`, type: 'node' });
        }
    } else {
        showNotification("Test finished. Fetching study materials... 📚", "info");
    }
    
    fetchResources(checkNode);
  };

  const fetchResources = async (node) => {
    setSelectedNode(node);
    setResources({ videos: [], articles: [], pdfs: [], trust_score: null, review_count: 0 }); 
    setLoadingResources(true);
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const searchQuery = `${topic} ${node.label}`;
        const res = await axios.get(`${baseUrl}/api/resources`, {
            params: { search_query: searchQuery, topic_key: topic, node_label: node.label, mode: mode }
        });
        
        const data = res.data || {};
        setResources({
            videos: data.videos || [],
            articles: data.articles || [],
            pdfs: data.pdfs || [],
            trust_score: data.trust_score || null,
            review_count: data.review_count || 0
        });
    } catch(e) { 
        console.error(e); 
        showNotification("Failed to load resources", "error");
    } 
    finally { 
        setLoadingResources(false); 
        setTimeout(() => {
            resourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300); 
    }
  };

  const chunkSize = isMobile ? 100 : 4; 
  const rows = [];
  for (let i = 0; i < nodes.length; i += chunkSize) rows.push(nodes.slice(i, i + chunkSize));

  if (mapLoading) return <div className="spinner"></div>;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-gradient)', color:'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}>
         <Navbar />
      </div>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      <div style={{ padding: '20px', borderBottom: '1px solid var(--card-border)', background: 'var(--nav-bg)', position:'sticky', top: isMobile ? '120px' : '70px', zIndex:50 }}> 
        <div style={{maxWidth:'1000px', margin:'0 auto', position:'relative'}}>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <span style={{
                    background: mode === 'panic' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                    color: mode === 'panic' ? 'var(--accent-red)' : 'var(--accent-blue)',
                    padding: '5px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', 
                    border: `1px solid ${mode === 'panic' ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
                    textTransform: 'uppercase', letterSpacing: '1px'
                }}>
                    {mode === 'panic' ? '🚨 Panic Mode' : '📚 Regular Mode'}
                </span>
            </div>

            <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', textTransform: 'capitalize', textAlign:'center', fontSize: isMobile ? '1.5rem' : '2rem' }}>
                🗺️ Path: <span style={{color: 'var(--accent-blue)'}}>{topic}</span>
            </h2>
            <div style={{width:'100%', background:'var(--card-border)', height:'10px', borderRadius:'5px', overflow:'hidden', marginBottom:'10px'}}>
                <div style={{width:`${progress}%`, background:'var(--accent-green)', height:'100%', transition:'width 0.5s ease'}}></div>
            </div>
            <p style={{textAlign:'center', fontSize:'0.9rem', color:'var(--text-muted)', margin:0}}>{progress}% Completed</p>
            <button onClick={handleSaveRoadmap} style={{position: 'absolute', right: '0', top: '0', padding: '8px 15px', background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>💾</button>
        </div>
      </div>

      <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {rows.map((row, rowIndex) => {
          const isEvenRow = rowIndex % 2 === 0;
          return (
            <div key={rowIndex} style={{ position: 'relative', width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: isMobile ? '20px' : '60px', 
                    flexDirection: isMobile ? 'column' : (isEvenRow ? 'row' : 'row-reverse'), 
                    alignItems: 'center',
                    padding: '30px 0', 
                    zIndex: 2 
                }}>
                    {row.map((node, i) => {
                        const globalIndex = rowIndex * chunkSize + i;
                        const isLocked = globalIndex > 0 && !completedNodes.has(nodes[globalIndex - 1].label);
                        const isCompleted = completedNodes.has(node.label);
                        const isSelected = selectedNode?.id === node.id;
                        
                        return (
                            <div key={node.id} style={{ display: 'flex', alignItems: 'center', flexDirection: isMobile ? 'column' : (isEvenRow ? 'row' : 'row-reverse') }}>
                                <div 
                                    onClick={() => handleNodeClick(node, globalIndex)} 
                                    style={{
                                        width: isMobile ? '140px' : '180px', height: isMobile ? '140px' : '180px',
                                        borderRadius: '50%',
                                        background: isCompleted ? 'rgba(40, 167, 69, 0.1)' : isSelected ? 'rgba(0, 123, 255, 0.1)' : 'var(--card-bg)',
                                        border: isLocked ? '3px solid var(--text-muted)' : isCompleted ? '3px solid var(--accent-green)' : isSelected ? '3px solid var(--accent-blue)' : '3px solid var(--card-border)',
                                        color: 'var(--text-main)',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                                        padding: '15px', textAlign: 'center', 
                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                        boxShadow: isSelected ? '0 0 20px rgba(0, 123, 255, 0.3)' : '0 5px 15px rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s ease', position: 'relative',
                                        wordBreak: 'break-word', overflow: 'hidden'
                                    }}
                                >
                                    {isLocked ? <FaLock size={20} color="var(--text-muted)" style={{marginBottom:'8px'}}/> : 
                                     isCompleted ? <FaCheckCircle color="var(--accent-green)" size={24} style={{marginBottom:'8px'}} /> : null}
                                    <span style={{fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight:'bold', lineHeight:'1.3', padding:'0 5px'}}>
                                        {node.label}
                                    </span>
                                </div>
                                {i < row.length - 1 && (
                                    <div style={{
                                        margin: isMobile ? '10px 0' : '0 20px', 
                                        fontSize: '24px', 
                                        color: isCompleted ? 'var(--accent-green)' : 'var(--text-muted)'
                                    }}>
                                        {isMobile ? <FaArrowDown/> : (isEvenRow ? <FaArrowRight/> : <FaArrowLeft/>)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!isMobile && rowIndex < rows.length -1 && (<div style={{position: 'absolute', right: isEvenRow ? '10%' : 'auto', left: isEvenRow ? 'auto' : '10%', top: '50%', height: '100%', width: '120px', zIndex: 1, borderRight: isEvenRow ? '4px dashed var(--card-border)' : 'none', borderLeft: isEvenRow ? 'none' : '4px dashed var(--card-border)', borderBottom: '4px dashed var(--card-border)', borderBottomRightRadius: isEvenRow ? '120px' : '0', borderBottomLeftRadius: isEvenRow ? '0' : '120px'}}></div>)}
            </div>
          );
        })}
      </div>

      <div ref={resourcesRef} style={{ background: 'var(--bg-solid)', padding: '50px 20px', borderTop: '2px solid var(--card-border)', minHeight: '500px' }}>
        {selectedNode ? (
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', flexWrap:'wrap', gap:'15px'}}>
                    <div style={{display:'flex', gap:'10px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center'}}>
                        <h2 style={{ borderLeft: '6px solid var(--accent-blue)', paddingLeft: '15px', margin:0, color: 'var(--text-main)' }}>
                            📚 Resources: <span style={{color:'var(--accent-blue)'}}>{selectedNode.label}</span>
                        </h2>
                        {!loadingResources && resources.trust_score !== null && (
                            <div style={{
                                padding: '8px 16px', borderRadius: '30px',
                                background: resources.trust_score >= 80 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                                border: resources.trust_score >= 80 ? '1px solid var(--accent-green)' : '1px solid #ffc107',
                                color: resources.trust_score >= 80 ? 'var(--accent-green)' : '#ffc107',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', animation: 'fadeIn 0.5s'
                            }}>
                                {resources.trust_score >= 80 ? '🔥' : '😐'} {resources.trust_score}% Satisfaction <span style={{fontSize:'0.8rem', opacity:0.8}}>({resources.review_count} reviews)</span>
                            </div>
                        )}
                    </div>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={() => setShowChatModal(true)} style={{padding:'15px 30px', background:'var(--accent-blue)', color:'white', border:'none', borderRadius:'30px', fontWeight:'bold', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'}}>
                            <FaRobot size={24}/> Ask AI
                        </button>

                        {!completedNodes.has(selectedNode.label) && (
                            <button onClick={handleStartFullAssessment} style={{padding:'15px 30px', background:'var(--accent-green)', color:'white', border:'none', borderRadius:'30px', fontWeight:'bold', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', width: isMobile ? '100%' : 'auto', justifyContent: 'center'}}>
                                <FaGraduationCap size={24}/> Take Assessment
                            </button>
                        )}
                    </div>
                </div>
                
                {loadingResources ? <div className="spinner"></div> : (
                    <div style={{display:'flex', gap:'30px', flexWrap:'wrap', flexDirection: isMobile ? 'column' : 'row'}}>
                        {/* Videos */}
                        <div style={{flex: 1, minWidth:'300px', background:'var(--card-bg)', padding:'20px', borderRadius:'10px', border:'1px solid var(--card-border)'}}>
                            <h3 style={{borderBottom:'2px solid var(--accent-red)', paddingBottom:'10px', marginTop:0, color: 'var(--text-main)'}}><FaPlayCircle color="var(--accent-red)"/> Videos</h3>
                            <div style={{display:'grid', gap:'15px'}}>{resources.videos.map((v, i) => (<div key={i} style={{display:'flex', gap:'10px', alignItems:'center'}}><a href={v.url} target="_blank" rel="noreferrer" style={{display:'flex', gap:'10px', textDecoration:'none', color:'var(--text-main)', width:'100%'}}><img src={v.thumbnail} style={{width:'80px', height:'60px', borderRadius:'5px', objectFit:'cover'}} /><div style={{flex:1}}><div style={{fontSize:'0.9rem', fontWeight:'bold', lineHeight:'1.2'}}>{v.title.slice(0, 50)}...</div><div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{v.channel}</div></div></a><button onClick={() => handleSaveResource(v, 'video')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="var(--accent-blue)"/></button></div>))}</div>
                        </div>
                        {/* Articles */}
                        <div style={{flex: 1, minWidth:'300px', background:'var(--card-bg)', padding:'20px', borderRadius:'10px', border:'1px solid var(--card-border)'}}>
                             <h3 style={{borderBottom:'2px solid var(--accent-green)', paddingBottom:'10px', marginTop:0, color: 'var(--text-main)'}}><FaGlobe color="var(--accent-green)"/> Articles</h3>
                             <div style={{display:'grid', gap:'10px'}}>{resources.articles?.map((a, i) => (<div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><a href={a.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'10px', flex:1}}><span style={{fontSize:'1.2rem'}}>📄</span><div style={{fontWeight:'bold', fontSize:'0.95rem'}}>{a.title}</div></a><button onClick={() => handleSaveResource(a, 'article')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="var(--accent-blue)"/></button></div>))}</div>
                        </div>
                        {/* PDFs */}
                        <div style={{flex: 1, minWidth:'300px', background:'var(--card-bg)', padding:'20px', borderRadius:'10px', border:'1px solid var(--card-border)'}}>
                             <h3 style={{borderBottom:'2px solid #ffc107', paddingBottom:'10px', marginTop:0, color: 'var(--text-main)'}}><FaFilePdf color="#ffc107"/> Cheat Sheets</h3>
                             <div style={{display:'grid', gap:'10px'}}>{resources.pdfs.map((p, i) => (<div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><a href={p.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'10px', flex:1}}><FaFilePdf color="var(--accent-red)"/><span style={{fontSize:'0.9rem', fontWeight:'500'}}>{p.title}</span></a><button onClick={() => handleSaveResource(p, 'pdf')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="var(--accent-blue)"/></button></div>))}</div>
                        </div>
                    </div>
                )}
            </div>
        ) : <div style={{textAlign:'center', color:'var(--text-muted)', marginTop:'50px'}}><h3>👆 Click a topic bubble above to start learning</h3></div>}
      </div>

      {/* ✅ RENDER CELEBRATION MODAL */}
      <CelebrationModal 
          isOpen={celebration.show} 
          title={celebration.title} 
          subtitle={celebration.subtitle} 
          type={celebration.type}
          onClose={() => setCelebration({ ...celebration, show: false })} 
      />

      {showCheckModal && checkNode && <KnowledgeCheckModal nodeLabel={checkNode.label} onYes={handleKnowsTopic} onNo={handleNewTopic} />}
      
      {showQuizModal && checkNode && (
        <AssessmentModal 
            mainTopic={topic} 
            subTopic={checkNode.label} 
            questionCount={quizType === 'diagnostic' ? 5 : 10}
            onClose={() => setShowQuizModal(false)} 
            onComplete={handleQuizComplete} 
            onRetry={handleUpgradeToFull} 
        />
      )}

      {showChatModal && selectedNode && (
          <NodeChatModal 
            mainTopic={topic}
            subTopic={selectedNode.label}
            onClose={() => setShowChatModal(false)}
          />
      )}
    </div>
  );
}
export default RoadmapGraph;