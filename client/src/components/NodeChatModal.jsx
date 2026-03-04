import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaRobot, FaPaperPlane, FaTimes, FaUser } from 'react-icons/fa';
import useMobile from '../hooks/useMobile';

function NodeChatModal({ mainTopic, subTopic, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your AI tutor for **${subTopic}**. What's confusing you?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const isMobile = useMobile();

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${baseUrl}/api/chat_node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: mainTopic,
          node_label: subTopic,
          message: userMsg.content,
          history: messages 
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Error getting response." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Connection error. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000,
        backdropFilter: 'blur(5px)'
    }}>
      <div style={{
          width: isMobile ? '95%' : '500px', height: '80vh', background: 'var(--bg-solid)',
          borderRadius: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid var(--card-border)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '15px 20px', background: 'var(--nav-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)' }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', color:'var(--text-main)'}}>
                <FaRobot color="var(--accent-blue)" size={24} />
                <div>
                    <h3 style={{margin:0, fontSize:'1rem'}}>Tutor: {subTopic}</h3>
                    <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{mainTopic}</span>
                </div>
            </div>
            <button onClick={onClose} style={{background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer'}}><FaTimes size={20}/></button>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', color: 'var(--text-main)' }}>
            {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--accent-green)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        {msg.role === 'user' ? <FaUser size={14} color="white"/> : <FaRobot size={16} color="white"/>}
                    </div>
                    <div style={{
                        maxWidth: '80%', padding: '10px 15px', borderRadius: '15px', fontSize: '0.95rem', lineHeight: '1.5',
                        background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--card-bg)', 
                        color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
                        borderTopRightRadius: msg.role === 'user' ? '0' : '15px', borderTopLeftRadius: msg.role === 'assistant' ? '0' : '15px'
                    }}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                </div>
            ))}
            {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '40px' }}>Thinking... 🧠</div>}
            <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '15px', background: 'var(--nav-bg)', display: 'flex', gap: '10px', borderTop: '1px solid var(--card-border)' }}>
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', outline: 'none' }}
            />
            <button onClick={handleSend} disabled={loading} style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--accent-blue)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <FaPaperPlane />
            </button>
        </div>
      </div>
    </div>
  );
}

export default NodeChatModal;