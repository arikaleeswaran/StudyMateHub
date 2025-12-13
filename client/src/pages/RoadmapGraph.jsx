import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getRoadmap } from '../services/api';
import { FaArrowRight, FaArrowLeft, FaPlayCircle, FaFilePdf, FaSave, FaGlobe, FaCheckCircle } from 'react-icons/fa'; // Added FaGlobe
import AssessmentModal from '../components/AssessmentModal';
import KnowledgeCheckModal from '../components/KnowledgeCheckModal';
import { useAuth } from '../context/AuthContext';

function RoadmapGraph() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { topic } = useParams();
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Initialize with all 3 types empty
  const [resources, setResources] = useState({ videos: [], articles: [], pdfs: [] });
  
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [checkNode, setCheckNode] = useState(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  
  const mapFetched = useRef(false);

  useEffect(() => {
    if (mapFetched.current === topic) return;
    const loadRoadmap = async () => {
      mapFetched.current = topic;
      setMapLoading(true);
      try {
        const data = await getRoadmap(topic);
        if (data && data.nodes) setNodes(data.nodes);
        else setNodes([{id:'1', label:`${topic} Basics`}]); 
      } catch(e) { console.error(e); } 
      finally { setMapLoading(false); }
    };
    if (topic) loadRoadmap();
  }, [topic]);

  const handleSaveRoadmap = async () => {
    if (!user) { alert("Please login to save!"); navigate('/auth'); return; }
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        await axios.post(`${baseUrl}/api/save_roadmap`, {
            user_id: user.id, topic: topic, graph_data: { nodes: nodes }
        });
        alert("Roadmap saved to profile!");
    } catch (e) { alert("Already exists or error saving."); }
  };

  const handleSaveResource = async (item, type) => {
    if (!user) return alert("Please login to save.");
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
        alert("Saved to Library!");
    } catch(e) { alert("Error saving resource"); }
  };

  const handleNodeClick = (node) => {
    if (selectedNode?.id === node.id) return; 
    setCheckNode(node); setShowCheckModal(true);
  };
  const handleKnowsTopic = () => { setShowCheckModal(false); setShowQuizModal(true); };
  const handleNewTopic = () => { setShowCheckModal(false); fetchResources(checkNode); };
  
  const handleQuizComplete = async (score, feedback) => {
    setShowQuizModal(false);
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
            alert(`Score: ${score}/5 Saved! 🏆`);
        } catch(e) { console.error(e); }
    }
    fetchResources(checkNode);
  };

  const fetchResources = async (node) => {
    setSelectedNode(node);
    setResources({ videos: [], articles: [], pdfs: [] }); // Reset all
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
      <div style={{ padding: '20px', borderBottom: '1px solid #eee', textAlign: 'center', background: '#fafafa', position:'sticky', top:0, zIndex:50 }}>
        <h2 style={{ margin: 0, color: '#333', textTransform: 'capitalize' }}>🗺️ Path: <span style={{color: '#007bff'}}>{topic}</span></h2>
        <button onClick={handleSaveRoadmap} style={{position: 'absolute', right: '30px', top: '20px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>💾 Save Path</button>
      </div>

      {/* Graph Area */}
      <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {rows.map((row, rowIndex) => {
          const isEvenRow = rowIndex % 2 === 0;
          const isLastRow = rowIndex === rows.length - 1;
          return (
            <div key={rowIndex} style={{ position: 'relative', width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexDirection: isEvenRow ? 'row' : 'row-reverse', padding: '20px 0', zIndex: 2 }}>
                    {row.map((node, i) => (
                        <div key={node.id} style={{ display: 'flex', alignItems: 'center', flexDirection: isEvenRow ? 'row' : 'row-reverse' }}>
                            <div onClick={() => handleNodeClick(node)} className={`node-bubble ${selectedNode?.id === node.id ? 'active' : ''}`}>{node.label}</div>
                            {i < row.length - 1 && !(rowIndex * chunkSize + i === nodes.length - 1) && <div style={{margin:'0 10px', fontSize:'24px', color:'#ccc'}}>{isEvenRow ? <FaArrowRight/> : <FaArrowLeft/>}</div>}
                        </div>
                    ))}
                </div>
                {!isLastRow && <div style={{position: 'absolute', right: isEvenRow ? '10%' : 'auto', left: isEvenRow ? 'auto' : '10%', top: '50%', height: '100%', width: '120px', zIndex: 1, borderRight: isEvenRow ? '4px dashed #ccc' : 'none', borderLeft: isEvenRow ? 'none' : '4px dashed #ccc', borderBottom: '4px dashed #ccc', borderBottomRightRadius: isEvenRow ? '120px' : '0', borderBottomLeftRadius: isEvenRow ? '0' : '120px'}}></div>}
            </div>
          );
        })}
      </div>

      {/* Resources Section */}
      <div style={{ background: '#f8f9fa', padding: '50px 20px', borderTop: '2px solid #ddd', minHeight: '500px' }}>
        {selectedNode ? (
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <h2 style={{ borderLeft: '6px solid #007bff', paddingLeft: '15px', marginBottom:'30px' }}>📚 Resources: <span style={{color:'#007bff'}}>{selectedNode.label}</span></h2>
                
                {loadingResources ? <div className="spinner"></div> : (
                    <div style={{display:'flex', gap:'30px', flexWrap:'wrap'}}>
                        
                        {/* COLUMN 1: VIDEOS */}
                        <div style={{flex: 1, minWidth:'300px', background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                            <h3 style={{borderBottom:'2px solid #ff0000', paddingBottom:'10px', marginTop:0}}><FaPlayCircle color="#ff0000"/> Videos</h3>
                            <div style={{display:'grid', gap:'15px'}}>
                                {resources.videos.map((v, i) => (
                                    <div key={i} className="video-card" style={{position:'relative', display:'flex', gap:'10px', alignItems:'center'}}>
                                        <a href={v.url} target="_blank" rel="noreferrer" style={{display:'flex', gap:'10px', textDecoration:'none', color:'#333', width:'100%'}}>
                                            <img src={v.thumbnail} style={{width:'80px', height:'60px', borderRadius:'5px', objectFit:'cover'}} />
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'0.9rem', fontWeight:'bold', lineHeight:'1.2'}}>{v.title.slice(0, 50)}...</div>
                                                <div style={{fontSize:'0.8rem', color:'#666'}}>{v.channel}</div>
                                            </div>
                                        </a>
                                        <button onClick={() => handleSaveResource(v, 'video')} style={{background:'none', border:'none', cursor:'pointer'}} title="Save Video"><FaSave color="#007bff" size={18}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* COLUMN 2: ARTICLES (NEW) */}
                        <div style={{flex: 1, minWidth:'300px', background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                             <h3 style={{borderBottom:'2px solid #28a745', paddingBottom:'10px', marginTop:0}}><FaGlobe color="#28a745"/> Articles</h3>
                             <div style={{display:'grid', gap:'10px'}}>
                                {resources.articles?.map((a, i) => (
                                    <div key={i} style={{padding:'10px', border:'1px solid #eee', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fdfdfd'}}>
                                        <a href={a.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                            <span style={{fontSize:'1.2rem'}}>📄</span>
                                            <div>
                                                <div style={{fontWeight:'bold', fontSize:'0.95rem'}}>{a.title}</div>
                                                {a.snippet && <div style={{fontSize:'0.8rem', color:'#777'}}>{a.snippet.slice(0, 60)}...</div>}
                                            </div>
                                        </a>
                                        <button onClick={() => handleSaveResource(a, 'article')} style={{background:'none', border:'none', cursor:'pointer', padding:'5px'}} title="Save Article"><FaSave color="#007bff" size={16}/></button>
                                    </div>
                                ))}
                                {(!resources.articles || resources.articles.length === 0) && <p style={{color:'#999'}}>No articles found.</p>}
                             </div>
                        </div>

                        {/* COLUMN 3: PDFS */}
                        <div style={{flex: 1, minWidth:'300px', background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                             <h3 style={{borderBottom:'2px solid #ffc107', paddingBottom:'10px', marginTop:0}}><FaFilePdf color="#ffc107"/> Cheat Sheets</h3>
                             <div style={{display:'grid', gap:'10px'}}>
                                 {resources.pdfs.map((p, i) => (
                                    <div key={i} style={{padding:'10px', border:'1px solid #eee', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fffbf0'}}>
                                        <a href={p.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#333', display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                            <FaFilePdf color="#dc3545"/>
                                            <span style={{fontSize:'0.9rem', fontWeight:'500'}}>{p.title}</span>
                                        </a>
                                        <button onClick={() => handleSaveResource(p, 'pdf')} style={{background:'none', border:'none', cursor:'pointer', padding:'5px'}} title="Save PDF"><FaSave color="#007bff" size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        ) : <div style={{textAlign:'center', color:'#aaa', marginTop:'50px'}}><h3>👆 Click a topic bubble above to start learning</h3></div>}
      </div>

      {showCheckModal && checkNode && <KnowledgeCheckModal nodeLabel={checkNode.label} onYes={handleKnowsTopic} onNo={handleNewTopic} />}
      {showQuizModal && checkNode && <AssessmentModal mainTopic={topic} subTopic={checkNode.label} onClose={() => setShowQuizModal(false)} onComplete={handleQuizComplete} />}
    </div>
  );
}
export default RoadmapGraph;