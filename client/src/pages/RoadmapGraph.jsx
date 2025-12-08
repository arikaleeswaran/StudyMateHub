import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getRoadmap } from '../services/api';
import { FaArrowRight, FaArrowLeft, FaPlayCircle, FaFilePdf } from 'react-icons/fa';
import AssessmentModal from '../components/AssessmentModal';
import KnowledgeCheckModal from '../components/KnowledgeCheckModal'; // <--- IMPORT THIS

function RoadmapGraph() {
  const { topic } = useParams();
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [resources, setResources] = useState({ videos: [], pdfs: [] });
  
  // MODAL STATES
  const [showCheckModal, setShowCheckModal] = useState(false); // First Popup (Yes/No)
  const [showQuizModal, setShowQuizModal] = useState(false);   // Quiz Popup
  const [checkNode, setCheckNode] = useState(null);            // Node being clicked
  const [loadingResources, setLoadingResources] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  // --- 1. LOAD ROADMAP ---
  useEffect(() => {
    const loadRoadmap = async () => {
        setMapLoading(true);
        try {
            const data = await getRoadmap(topic);
            if (data && data.nodes) setNodes(data.nodes);
        } catch(e) { 
            console.error(e);
        } finally {
            setMapLoading(false);
        }
    };
    if (topic) loadRoadmap();
  }, [topic]);

  // --- 2. CLICK HANDLER (OPENS POPUP INSTEAD OF ALERT) ---
  const handleNodeClick = (node) => {
    if (selectedNode?.id === node.id) return; 
    setCheckNode(node);
    setShowCheckModal(true); // <--- This triggers the beautiful design
  };

  // --- 3. HANDLE "YES" (Take Quiz) ---
  const handleKnowsTopic = () => {
    setShowCheckModal(false);
    setShowQuizModal(true);
  };

  // --- 4. HANDLE "NO" (View Resources) ---
  const handleNewTopic = () => {
    setShowCheckModal(false);
    fetchResources(checkNode);
  };

  // --- 5. FETCH RESOURCES ---
  const fetchResources = async (node) => {
    setSelectedNode(node);
    setResources({ videos: [], pdfs: [] }); 
    setLoadingResources(true);

    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const res = await axios.get(`${baseUrl}/api/resources?topic=${topic} ${node.label}`);
        setResources(res.data);
    } catch(e) { console.error(e); } 
    finally {
        setLoadingResources(false);
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    }
  };

  // --- 6. ZIG-ZAG LAYOUT ---
  const chunkSize = 4;
  const rows = [];
  for (let i = 0; i < nodes.length; i += chunkSize) {
    rows.push(nodes.slice(i, i + chunkSize));
  }

  if (mapLoading) {
      return (
          <div style={{height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
              <div className="spinner"></div>
              <h3 style={{marginTop:'20px', color:'#555'}}>Generating Path...</h3>
          </div>
      )
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <div style={{ padding: '20px', borderBottom: '1px solid #eee', textAlign: 'center', background: '#fafafa', position:'sticky', top:0, zIndex:50 }}>
        <h2 style={{ margin: 0, color: '#333' }}>🗺️ Path: <span style={{color: '#007bff'}}>{topic}</span></h2>
      </div>

      {/* GRAPH */}
      <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {rows.map((row, rowIndex) => {
          const isEvenRow = rowIndex % 2 === 0;
          const isLastRow = rowIndex === rows.length - 1;
          return (
            <div key={rowIndex} style={{ position: 'relative', width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexDirection: isEvenRow ? 'row' : 'row-reverse', padding: '20px 0', zIndex: 2 }}>
                    {row.map((node, i) => {
                        const isLastInRow = i === row.length - 1;
                        const isLastOverall = (rowIndex * chunkSize) + i === nodes.length - 1;
                        return (
                            <div key={node.id} style={{ display: 'flex', alignItems: 'center', flexDirection: isEvenRow ? 'row' : 'row-reverse' }}>
                                <div onClick={() => handleNodeClick(node)} className={`node-bubble ${selectedNode?.id === node.id ? 'active' : ''}`}>
                                    {node.label}
                                </div>
                                {!isLastInRow && !isLastOverall && (
                                    <div style={{margin:'0 10px', fontSize:'24px', color:'#ccc'}}>
                                        {isEvenRow ? <FaArrowRight/> : <FaArrowLeft/>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!isLastRow && (
                    <div style={{
                        position: 'absolute',
                        right: isEvenRow ? '10%' : 'auto', left: isEvenRow ? 'auto' : '10%',
                        top: '50%', height: '100%', width: '120px', zIndex: 1,
                        borderRight: isEvenRow ? '4px dashed #ccc' : 'none',
                        borderLeft: isEvenRow ? 'none' : '4px dashed #ccc',
                        borderBottom: '4px dashed #ccc',
                        borderBottomRightRadius: isEvenRow ? '120px' : '0',
                        borderBottomLeftRadius: isEvenRow ? '0' : '120px',
                    }}></div>
                )}
            </div>
          );
        })}
      </div>

      {/* RESOURCES PANEL */}
      <div style={{ background: '#f8f9fa', padding: '50px 20px', borderTop: '2px solid #ddd', minHeight: '500px' }}>
        {selectedNode ? (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ borderLeft: '6px solid #007bff', paddingLeft: '15px', marginBottom:'30px' }}>
                    📚 Resources: <span style={{color:'#007bff'}}>{selectedNode.label}</span>
                </h2>
                
                {loadingResources ? (
                    <div style={{textAlign:'center', padding:'40px'}}>
                        <div className="spinner"></div>
                        <p style={{marginTop:'15px', color:'#666'}}>Fetching Videos & PDFs...</p>
                    </div>
                ) : (
                    <div style={{display:'flex', gap:'40px', flexWrap:'wrap'}}>
                        {/* VIDEOS */}
                        <div style={{flex: 1, minWidth:'300px'}}>
                            <h3 style={{display:'flex', alignItems:'center', gap:'10px', color:'#d32f2f'}}>
                                <FaPlayCircle/> Video Tutorials
                            </h3>
                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'20px'}}>
                                {resources.videos.length > 0 ? resources.videos.map((v, i) => (
                                    <a key={i} href={v.url} target="_blank" rel="noreferrer" className="video-card">
                                        <img src={v.thumbnail} alt="thumb" className="video-thumb" />
                                        <div className="video-info">
                                            <div className="video-title">{v.title.slice(0, 60)}...</div>
                                            <div className="video-channel">{v.channel}</div>
                                        </div>
                                    </a>
                                )) : <p>No videos found.</p>}
                            </div>
                        </div>
                        {/* PDFS */}
                        <div style={{flex: 1, minWidth:'300px'}}>
                             <h3 style={{display:'flex', alignItems:'center', gap:'10px', color:'#2e7d32'}}>
                                <FaFilePdf/> Notes & PDFs
                             </h3>
                             {resources.pdfs.length > 0 ? resources.pdfs.map((p, i) => (
                                <a key={i} href={p.url} target="_blank" rel="noreferrer" className="pdf-link">
                                    <span>📄 {p.title}</span>
                                </a>
                            )) : <p>No PDFs found.</p>}
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div style={{textAlign:'center', color:'#aaa', marginTop:'50px'}}>
                <h3>👆 Click a topic bubble above to start learning</h3>
            </div>
        )}
      </div>

      {/* --- THIS IS THE NEW POPUP --- */}
      {showCheckModal && checkNode && (
        <KnowledgeCheckModal 
            nodeLabel={checkNode.label}
            onYes={handleKnowsTopic}
            onNo={handleNewTopic}
        />
      )}

      {/* --- THIS IS THE QUIZ --- */}
      {showQuizModal && checkNode && (
        <AssessmentModal 
            mainTopic={topic} 
            subTopic={checkNode.label}
            onClose={() => setShowQuizModal(false)}
            onComplete={(score) => {
                setShowQuizModal(false);
                alert(`Quiz Done! Score: ${score}`);
                fetchResources(checkNode);
            }}
        />
      )}

    </div>
  );
}

export default RoadmapGraph;