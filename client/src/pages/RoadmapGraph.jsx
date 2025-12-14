import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getRoadmap } from '../services/api';
import { FaArrowRight, FaArrowLeft, FaPlayCircle, FaFilePdf, FaSave, FaGlobe, FaCheckCircle, FaLock, FaGraduationCap } from 'react-icons/fa';
import AssessmentModal from '../components/AssessmentModal';
import KnowledgeCheckModal from '../components/KnowledgeCheckModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase'; 

function RoadmapGraph() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { topic } = useParams();
  
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [resources, setResources] = useState({ videos: [], articles: [], pdfs: [] });
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const [progress, setProgress] = useState(0);

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizType, setQuizType] = useState('full'); 
  const [checkNode, setCheckNode] = useState(null);
  
  const [loadingResources, setLoadingResources] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  
  const mapFetched = useRef(false);

  useEffect(() => {
    if (mapFetched.current === topic) return;
    const init = async () => {
        mapFetched.current = topic;
        setMapLoading(true);
        try {
            const data = await getRoadmap(topic);
            if (data && data.nodes) setNodes(data.nodes);
            else setNodes([{id:'1', label:`${topic} Basics`}]);
        } catch(e) { console.error(e); }

        if (user) {
            const { data } = await supabase.from('node_progress')
                .select('node_label, quiz_score')
                .eq('user_id', user.id)
                .eq('topic', topic);
            
            if (data) {
                // Pass mark: Score >= 6 for Full OR Score >= 3 for Shortcut
                const passedNodes = data.filter(d => d.quiz_score >= 3).map(d => d.node_label);
                setCompletedNodes(new Set(passedNodes));
            }
        }
        setMapLoading(false);
    };
    init();
  }, [topic, user]);

  useEffect(() => {
      if (nodes.length > 0) {
          const percent = Math.round((completedNodes.size / nodes.length) * 100);
          setProgress(percent);
      }
  }, [nodes, completedNodes]);

  const handleSaveRoadmap = async () => {
    if (!user) { alert("Login required"); navigate('/auth'); return; }
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_roadmap`, {
            user_id: user.id, topic: topic, graph_data: { nodes: nodes }
        });
        alert("Roadmap saved!");
    } catch (e) { alert("Error saving."); }
  };

  const handleSaveResource = async (item, type) => {
    if (!user) return alert("Login required");
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_resource`, {
            user_id: user.id,
            roadmap_topic: topic,
            node_label: selectedNode.label,
            resource_type: type,
            title: item.title,
            url: item.url,
            thumbnail: item.thumbnail || ''
        });
        alert("Saved!");
    } catch(e) { alert("Error saving."); }
  };

  const handleNodeClick = (node, index) => {
    if (index > 0 && !completedNodes.has(nodes[index - 1].label)) {
        alert("🔒 Locked! Please complete the previous module first.");
        return;
    }
    setCheckNode(node); 
    setShowCheckModal(true); 
  };

  const handleKnowsTopic = () => { 
      setShowCheckModal(false); 
      setQuizType('diagnostic'); 
      setShowQuizModal(true); 
  };

  const handleNewTopic = () => { 
      setShowCheckModal(false); 
      fetchResources(checkNode); 
  };
  
  const handleStartFullAssessment = () => {
      setQuizType('full'); 
      setShowQuizModal(true);
  };

  const handleUpgradeToFull = () => {
      setQuizType('full');
  };

  const handleQuizComplete = async (score, feedback) => {
    setShowQuizModal(false); // Close Modal

    // 1. ALWAYS SAVE SCORE TO DB
    if(user) {
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
            await axios.post(`${baseUrl}/api/submit_progress`, {
                user_id: user.id,
                topic: topic,
                node_label: checkNode.label,
                score: score,
                feedback: feedback
            });
            console.log("✅ Score Saved to Database");
        } catch(e) { console.error("❌ Error saving score:", e); }
    }
    
    // 2. Determine Pass/Fail for UI Logic
    let passed = false;
    if (quizType === 'diagnostic') passed = score >= 3;
    else passed = score >= 6; 

    if (passed) {
        setCompletedNodes(prev => new Set(prev).add(checkNode.label));
        alert("🎉 Module Passed!");
    } else {
        if (quizType === 'diagnostic') fetchResources(checkNode); 
    }
  };

  const fetchResources = async (node) => {
    setSelectedNode(node);
    setResources({ videos: [], articles: [], pdfs: [] }); 
    setLoadingResources(true);
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const res = await axios.get(`${baseUrl}/api/resources?topic=${topic} ${node.label}`);
        setResources(res.data);
    } catch(e) { console.error(e); } 
    finally { 
        setLoadingResources(false); 
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100); 
    }
  };

  const chunkSize = 4;
  const rows = [];
  for (let i = 0; i < nodes.length; i += chunkSize) rows.push(nodes.slice(i, i + chunkSize));

  if (mapLoading) return <div className="spinner"></div>;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #eee', background: '#fafafa', position:'sticky', top:0, zIndex:50 }}>
        <div style={{maxWidth:'1000px', margin:'0 auto', position:'relative'}}>
            <h2 style={{ margin: '0 0 10px 0', color: '#333', textTransform: 'capitalize', textAlign:'center' }}>
                🗺️ Path: <span style={{color: '#007bff'}}>{topic}</span>
            </h2>
            <div style={{width:'100%', background:'#e9ecef', height:'10px', borderRadius:'5px', overflow:'hidden', marginBottom:'10px'}}>
                <div style={{width:`${progress}%`, background:'#28a745', height:'100%', transition:'width 0.5s ease'}}></div>
            </div>
            <p style={{textAlign:'center', fontSize:'0.9rem', color:'#666', margin:0}}>{progress}% Completed</p>
            <button onClick={handleSaveRoadmap} style={{position: 'absolute', right: '0', top: '0', padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>💾 Save Path</button>
        </div>
      </div>

      {/* Graph */}
      <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {rows.map((row, rowIndex) => {
          const isEvenRow = rowIndex % 2 === 0;
          const isLastRow = rowIndex === rows.length - 1;
          return (
            <div key={rowIndex} style={{ position: 'relative', width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexDirection: isEvenRow ? 'row' : 'row-reverse', padding: '30px 0', zIndex: 2 }}>
                    {row.map((node, i) => {
                        const globalIndex = rowIndex * chunkSize + i;
                        const isLocked = globalIndex > 0 && !completedNodes.has(nodes[globalIndex - 1].label);
                        const isCompleted = completedNodes.has(node.label);
                        const isSelected = selectedNode?.id === node.id;
                        
                        return (
                            <div key={node.id} style={{ display: 'flex', alignItems: 'center', flexDirection: isEvenRow ? 'row' : 'row-reverse' }}>
                                <div 
                                    onClick={() => handleNodeClick(node, globalIndex)} 
                                    style={{
                                        width: '180px', height: '180px',
                                        borderRadius: '50%',
                                        background: isCompleted ? '#d4edda' : isSelected ? '#e3f2fd' : '#ffffff',
                                        border: isLocked ? '3px solid #ccc' : isCompleted ? '3px solid #28a745' : isSelected ? '3px solid #007bff' : '3px solid #333',
                                        color: '#333',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                                        padding: '15px', textAlign: 'center', 
                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                        boxShadow: isSelected ? '0 0 15px rgba(0,123,255,0.4)' : '0 4px 6px rgba(0,0,0,0.1)',
                                        transition: 'all 0.3s ease', position: 'relative',
                                        wordBreak: 'break-word', overflow: 'hidden'
                                    }}
                                >
                                    {isLocked ? <FaLock size={20} color="#999" style={{marginBottom:'8px'}}/> : 
                                     isCompleted ? <FaCheckCircle color="#28a745" size={24} style={{marginBottom:'8px'}} /> : null}
                                    <span style={{fontSize:'0.85rem', fontWeight:'bold', lineHeight:'1.3', padding:'0 5px'}}>
                                        {node.label}
                                    </span>
                                </div>
                                {i < row.length - 1 && (<div style={{margin:'0 20px', fontSize:'24px', color: isCompleted ? '#28a745' : '#ccc'}}>{isEvenRow ? <FaArrowRight/> : <FaArrowLeft/>}</div>)}
                            </div>
                        );
                    })}
                </div>
                {!isLastRow && (<div style={{position: 'absolute', right: isEvenRow ? '10%' : 'auto', left: isEvenRow ? 'auto' : '10%', top: '50%', height: '100%', width: '120px', zIndex: 1, borderRight: isEvenRow ? '4px dashed #ccc' : 'none', borderLeft: isEvenRow ? 'none' : '4px dashed #ccc', borderBottom: '4px dashed #ccc', borderBottomRightRadius: isEvenRow ? '120px' : '0', borderBottomLeftRadius: isEvenRow ? '0' : '120px'}}></div>)}
            </div>
          );
        })}
      </div>

      <div style={{ background: '#f8f9fa', padding: '50px 20px', borderTop: '2px solid #ddd', minHeight: '500px' }}>
        {selectedNode ? (
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
                    <h2 style={{ borderLeft: '6px solid #007bff', paddingLeft: '15px', margin:0 }}>
                        📚 Resources: <span style={{color:'#007bff'}}>{selectedNode.label}</span>
                    </h2>
                    
                    {!completedNodes.has(selectedNode.label) && (
                        <button onClick={handleStartFullAssessment} style={{padding:'15px 30px', background:'#28a745', color:'white', border:'none', borderRadius:'30px', fontWeight:'bold', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
                            <FaGraduationCap size={24}/>
                            Take Assessment (10 Qs)
                        </button>
                    )}
                </div>
                
                {loadingResources ? <div className="spinner"></div> : (
                    <div style={{display:'flex', gap:'30px', flexWrap:'wrap'}}>
                        <div style={{flex: 1, minWidth:'300px', background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                            <h3 style={{borderBottom:'2px solid #ff0000', paddingBottom:'10px', marginTop:0}}><FaPlayCircle color="#ff0000"/> Videos</h3>
                            <div style={{display:'grid', gap:'15px'}}>{resources.videos.map((v, i) => (<div key={i} style={{display:'flex', gap:'10px', alignItems:'center'}}><a href={v.url} target="_blank" rel="noreferrer" style={{display:'flex', gap:'10px', textDecoration:'none', color:'#333', width:'100%'}}><img src={v.thumbnail} style={{width:'80px', height:'60px', borderRadius:'5px', objectFit:'cover'}} /><div style={{flex:1}}><div style={{fontSize:'0.9rem', fontWeight:'bold', lineHeight:'1.2'}}>{v.title.slice(0, 50)}...</div><div style={{fontSize:'0.8rem', color:'#666'}}>{v.channel}</div></div></a><button onClick={() => handleSaveResource(v, 'video')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="#007bff"/></button></div>))}</div>
                        </div>
                        <div style={{flex: 1, minWidth:'300px', background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                             <h3 style={{borderBottom:'2px solid #28a745', paddingBottom:'10px', marginTop:0}}><FaGlobe color="#28a745"/> Articles</h3>
                             <div style={{display:'grid', gap:'10px'}}>{resources.articles?.map((a, i) => (<div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><a href={a.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', display:'flex', alignItems:'center', gap:'10px', flex:1}}><span style={{fontSize:'1.2rem'}}>📄</span><div style={{fontWeight:'bold', fontSize:'0.95rem'}}>{a.title}</div></a><button onClick={() => handleSaveResource(a, 'article')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="#007bff"/></button></div>))}</div>
                        </div>
                        <div style={{flex: 1, minWidth:'300px', background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                             <h3 style={{borderBottom:'2px solid #ffc107', paddingBottom:'10px', marginTop:0}}><FaFilePdf color="#ffc107"/> Cheat Sheets</h3>
                             <div style={{display:'grid', gap:'10px'}}>{resources.pdfs.map((p, i) => (<div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><a href={p.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', display:'flex', alignItems:'center', gap:'10px', flex:1}}><FaFilePdf color="#dc3545"/><span style={{fontSize:'0.9rem', fontWeight:'500'}}>{p.title}</span></a><button onClick={() => handleSaveResource(p, 'pdf')} style={{background:'none', border:'none', cursor:'pointer'}}><FaSave color="#007bff"/></button></div>))}</div>
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