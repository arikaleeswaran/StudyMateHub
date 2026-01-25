import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight, FaArrowLeft, FaPlayCircle, FaFilePdf, FaSave, FaGlobe, FaCheckCircle, FaLock, FaGraduationCap, FaArrowDown } from 'react-icons/fa';
import AssessmentModal from '../components/AssessmentModal';
import KnowledgeCheckModal from '../components/KnowledgeCheckModal';
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
  const [selectedNode, setSelectedNode] = useState(null);
  const [resources, setResources] = useState({ videos: [], articles: [], pdfs: [], trust_score: null, review_count: 0 });
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const [progress, setProgress] = useState(0);

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizType, setQuizType] = useState('full'); 
  const [checkNode, setCheckNode] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loadingResources, setLoadingResources] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  
  const mapFetched = useRef(false);

  useEffect(() => {
    if (mapFetched.current === topic + location.search) return;
    const init = async () => {
        mapFetched.current = topic + location.search;
        setMapLoading(true);
        const params = new URLSearchParams(location.search);
        const mode = params.get('mode') || 'standard';
        
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
            const res = await axios.get(`${baseUrl}/api/roadmap?topic=${topic}&mode=${mode}`);
            const data = res.data;
            if (data && data.nodes) setNodes(data.nodes);
            else setNodes([{id:'1', label:`${topic} Basics`}]);
            if (mode === 'panic') showNotification("🚨 Panic Mode: Crash Course Activated!", "error");
        } catch(e) { console.error(e); }

        if (user) {
            const { data } = await supabase.from('node_progress').select('node_label, quiz_score').eq('user_id', user.id).eq('topic', topic);
            if (data) {
                const passedNodes = data.filter(d => d.quiz_score >= 3).map(d => d.node_label);
                setCompletedNodes(new Set(passedNodes));
            }
        } else {
            const guestDataRaw = localStorage.getItem('guest_data');
            if (guestDataRaw) {
                const guestData = JSON.parse(guestDataRaw);
                const passedGuest = guestData.progress
                    .filter(p => p.topic === topic && p.quiz_score >= 3)
                    .map(p => p.node_label);
                setCompletedNodes(new Set(passedGuest));
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

  const saveToLocalGuest = (key, data) => {
    const existing = JSON.parse(localStorage.getItem('guest_data') || '{"roadmap": null, "progress": [], "resources": []}');
    if (key === 'roadmap') existing.roadmap = data;
    else if (key === 'progress') existing.progress.push(data);
    else if (key === 'resources') existing.resources.push(data);
    localStorage.setItem('guest_data', JSON.stringify(existing));
  };

  const handleSaveRoadmap = async () => {
    if (!user) { 
        saveToLocalGuest('roadmap', { topic: topic, graph_data: { nodes: nodes } });
        showNotification("⚠️ Saved locally! Login to save permanently.", "warning");
        setTimeout(() => navigate('/auth'), 2000); 
        return; 
    }
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_roadmap`, { user_id: user.id, topic: topic, graph_data: { nodes: nodes } });
        showNotification("Roadmap saved successfully!");
    } catch (e) { showNotification("Error saving roadmap", "error"); }
  };

  const handleSaveResource = async (item, type) => {
    const resourceData = {
        roadmap_topic: topic, node_label: selectedNode.label, resource_type: type, 
        title: item.title, url: item.url, thumbnail: item.thumbnail || ''
    };

    if (!user) {
        saveToLocalGuest('resources', resourceData);
        showNotification("Saved to guest library! 📚 (Login to keep)", "warning");
        return;
    }

    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_resource`, {
            user_id: user.id, ...resourceData
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

  // --- NEW: Calculate History ---
  const getHistoryParams = () => {
    if (!checkNode || nodes.length === 0) return "";
    const currentIndex = nodes.findIndex(n => n.id === checkNode.id);
    if (currentIndex <= 0) return ""; 
    const prevNodes = nodes.slice(Math.max(0, currentIndex - 4), currentIndex).map(n => n.label);
    return prevNodes.join(", ");
  };

  const handleQuizComplete = async (score, feedback) => {
    setShowQuizModal(false);
    const progressData = {
        topic: topic, node_label: checkNode.label, quiz_score: score, feedback_text: feedback, sentiment_score: 0 
    };

    if(user) {
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
            await axios.post(`${baseUrl}/api/submit_progress`, { 
                user_id: user.id, username: user.user_metadata?.full_name || user.email.split('@')[0], ...progressData
            });
        } catch(e) { console.error(e); }
    } else {
        saveToLocalGuest('progress', progressData);
    }

    let passed = quizType === 'diagnostic' ? score >= 3 : score >= 6; 
    if (passed) {
        setCompletedNodes(prev => new Set(prev).add(checkNode.label));
        showNotification(user ? "🎉 Module Passed! Unlocked next step." : "🎉 Guest: Module Passed! (Login to save)");
    } else {
        if (quizType === 'diagnostic') fetchResources(checkNode); 
        else showNotification("Keep studying! Try again later.", "error");
    }
  };

  const fetchResources = async (node) => {
    setSelectedNode(node);
    setResources({ videos: [], articles: [], pdfs: [], trust_score: null, review_count: 0 }); 
    setLoadingResources(true);
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode') || 'standard';
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const searchQuery = `${topic} ${node.label}`;
        const res = await axios.get(`${baseUrl}/api/resources`, {
            params: { search_query: searchQuery, topic_key: topic, node_label: node.label, mode: mode }
        });
        setResources(res.data);
    } catch(e) { console.error(e); } 
    finally { 
        setLoadingResources(false); 
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100); 
    }
  };

  const chunkSize = isMobile ? 100 : 4; 
  const rows = [];
  for (let i = 0; i < nodes.length; i += chunkSize) rows.push(nodes.slice(i, i + chunkSize));

  if (mapLoading) return <div className="spinner"></div>;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b, #0f172a)', color:'white', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}>
         <Navbar />
      </div>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)', position:'sticky', top: isMobile ? '120px' : '70px', zIndex:50 }}> 
        <div style={{maxWidth:'1000px', margin:'0 auto', position:'relative'}}>
            <h2 style={{ margin: '0 0 10px 0', color: 'white', textTransform: 'capitalize', textAlign:'center', fontSize: isMobile ? '1.5rem' : '2rem' }}>
                🗺️ Path: <span style={{color: '#00d2ff'}}>{topic}</span>
            </h2>
            <div style={{width:'100%', background:'rgba(255,255,255,0.1)', height:'10px', borderRadius:'5px', overflow:'hidden', marginBottom:'10px'}}>
                <div style={{width:`${progress}%`, background:'#28a745', height:'100%', transition:'width 0.5s ease'}}></div>
            </div>
            <p style={{textAlign:'center', fontSize:'0.9rem', color:'#aaa', margin:0}}>{progress}% Completed</p>
            <button onClick={handleSaveRoadmap} style={{position: 'absolute', right: '0', top: '0', padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>💾</button>
        </div>
      </div>

      <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {rows.map((row, rowIndex) => {
          const isEvenRow = rowIndex % 2 === 0;
          return (
            <div key={rowIndex} style={{ position: 'relative', width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                    display: 'flex', justifyContent: 'center', gap: isMobile ? '20px' : '60px', 
                    flexDirection: isMobile ? 'column' : (isEvenRow ? 'row' : 'row-reverse'), 
                    alignItems: 'center', padding: '30px 0', zIndex: 2 
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
                                        background: isCompleted ? 'rgba(40, 167, 69, 0.2)' : isSelected ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                                        border: isLocked ? '3px solid #555' : isCompleted ? '3px solid #28a745' : isSelected ? '3px solid #00d2ff' : '3px solid rgba(255,255,255,0.2)',
                                        color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                                        padding: '15px', textAlign: 'center', cursor: isLocked ? 'not-allowed' : 'pointer',
                                        boxShadow: isSelected ? '0 0 20px rgba(0,210,255,0.4)' : 'none',
                                        transition: 'all 0.3s ease', position: 'relative', wordBreak: 'break-word', overflow: 'hidden'
                                    }}
                                >
                                    {isLocked ? <FaLock size={20} color="#777" style={{marginBottom:'8px'}}/> : 
                                     isCompleted ? <FaCheckCircle color="#28a745" size={24} style={{marginBottom:'8px'}} /> : null}
                                    <span style={{fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight:'bold', lineHeight:'1.3', padding:'0 5px'}}>
                                        {node.label}
                                    </span>
                                </div>
                                {i < row.length - 1 && (
                                    <div style={{
                                        margin: isMobile ? '10px 0' : '0 20px', fontSize: '24px', color: isCompleted ? '#28a745' : '#555'
                                    }}>
                                        {isMobile ? <FaArrowDown/> : (isEvenRow ? <FaArrowRight/> : <FaArrowLeft/>)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!isMobile && rowIndex < rows.length -1 && (<div style={{position: 'absolute', right: isEvenRow ? '10%' : 'auto', left: isEvenRow ? 'auto' : '10%', top: '50%', height: '100%', width: '120px', zIndex: 1, borderRight: isEvenRow ? '4px dashed #555' : 'none', borderLeft: isEvenRow ? 'none' : '4px dashed #555', borderBottom: '4px dashed #555', borderBottomRightRadius: isEvenRow ? '120px' : '0', borderBottomLeftRadius: isEvenRow ? '0' : '120px'}}></div>)}
            </div>
          );
        })}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '50px 20px', borderTop: '2px solid rgba(255,255,255,0.1)', minHeight: '500px' }}>
        {selectedNode ? (
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', flexWrap:'wrap', gap:'15px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center'}}>
                        <h2 style={{ borderLeft: '6px solid #00d2ff', paddingLeft: '15px', margin:0, color: 'white' }}>
                            📚 Resources: <span style={{color:'#00d2ff'}}>{selectedNode.label}</span>
                        </h2>
                        {!loadingResources && resources.trust_score !== null && (
                            <div style={{
                                padding: '8px 16px', borderRadius: '30px',
                                background: resources.trust_score >= 80 ? 'rgba(40, 167, 69, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                                border: resources.trust_score >= 80 ? '1px solid #28a745' : '1px solid #ffc107',
                                color: resources.trust_score >= 80 ? '#28a745' : '#ffc107',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', animation: 'fadeIn 0.5s'
                            }}>
                                {resources.trust_score >= 80 ? '🔥' : '😐'} {resources.trust_score}% Satisfaction <span style={{fontSize:'0.8rem', opacity:0.8}}>({resources.review_count} reviews)</span>
                            </div>
                        )}
                    </div>
                    {!completedNodes.has(selectedNode.label) && (
                        <button onClick={handleStartFullAssessment} style={{padding:'15px 30px', background:'#28a745', color:'white', border:'none', borderRadius:'30px', fontWeight:'bold', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', width: isMobile ? '100%' : 'auto', justifyContent: 'center'}}>
                            <FaGraduationCap size={24}/> Take Assessment
                        </button>
                    )}
                </div>
                
                {loadingResources ? <div className="spinner"></div> : (
                    <div style={{display:'flex', gap:'30px', flexWrap:'wrap', flexDirection: isMobile ? 'column' : 'row'}}>
                        <div style={{flex: 1, minWidth:'300px', background:'rgba(255,255,255,0.05)', padding:'20px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.1)'}}>
                            <h3 style={{borderBottom:'2px solid #ff6b6b', paddingBottom:'10px', marginTop:0, color: 'white'}}><FaPlayCircle color="#ff6b6b"/> Videos</h3>
                            <div style={{display:'grid', gap:'15px'}}>{resources.videos.map((v, i) => (<div key={i} style={{display:'flex', gap:'10px', alignItems:'center'}}><a href={v.url} target="_blank" rel="noreferrer" style={{display:'flex', gap:'10px', textDecoration:'none', color:'white', width:'100%'}}><img src={v.thumbnail} style={{width:'80px', height:'60px', borderRadius:'5px', objectFit:'cover'}} /><div style={{flex:1}}><div style={{fontSize:'0.9rem', fontWeight:'bold', lineHeight:'1.2'}}>{v.title.slice(0, 50)}...</div><div style={{fontSize:'0.8rem', color:'#aaa'}}>{v.channel}</div></div></a><button onClick={() => handleSaveResource(v, 'video')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="#00d2ff"/></button></div>))}</div>
                        </div>
                        <div style={{flex: 1, minWidth:'300px', background:'rgba(255,255,255,0.05)', padding:'20px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.1)'}}>
                             <h3 style={{borderBottom:'2px solid #4caf50', paddingBottom:'10px', marginTop:0, color: 'white'}}><FaGlobe color="#4caf50"/> Articles</h3>
                             <div style={{display:'grid', gap:'10px'}}>{resources.articles?.map((a, i) => (<div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><a href={a.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'white', display:'flex', alignItems:'center', gap:'10px', flex:1}}><span style={{fontSize:'1.2rem'}}>📄</span><div style={{fontWeight:'bold', fontSize:'0.95rem'}}>{a.title}</div></a><button onClick={() => handleSaveResource(a, 'article')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="#00d2ff"/></button></div>))}</div>
                        </div>
                        <div style={{flex: 1, minWidth:'300px', background:'rgba(255,255,255,0.05)', padding:'20px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.1)'}}>
                             <h3 style={{borderBottom:'2px solid #ffc107', paddingBottom:'10px', marginTop:0, color: 'white'}}><FaFilePdf color="#ffc107"/> Cheat Sheets</h3>
                             <div style={{display:'grid', gap:'10px'}}>{resources.pdfs.map((p, i) => (<div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><a href={p.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'white', display:'flex', alignItems:'center', gap:'10px', flex:1}}><FaFilePdf color="#dc3545"/><span style={{fontSize:'0.9rem', fontWeight:'500'}}>{p.title}</span></a><button onClick={() => handleSaveResource(p, 'pdf')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="#00d2ff"/></button></div>))}</div>
                        </div>
                    </div>
                )}
            </div>
        ) : <div style={{textAlign:'center', color:'#aaa', marginTop:'50px'}}><h3>👆 Click a topic bubble above to start learning</h3></div>}
      </div>

      {showCheckModal && checkNode && <KnowledgeCheckModal nodeLabel={checkNode.label} onYes={handleKnowsTopic} onNo={handleNewTopic} />}
      
      {showQuizModal && checkNode && (
        <AssessmentModal 
            mainTopic={topic} 
            subTopic={checkNode.label} 
            history={getHistoryParams()} // ✅ History passed here
            questionCount={quizType === 'diagnostic' ? 5 : 10}
            onClose={() => setShowQuizModal(false)} 
            onComplete={handleQuizComplete} 
            onRetry={handleUpgradeToFull} 
        />
      )}
    </div>
  );
}
export default RoadmapGraph;