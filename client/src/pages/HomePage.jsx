import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const [topic, setTopic] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      navigate(`/roadmap/${topic}`);
    }
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#1a1a1a', // Dark background like your screenshot
      color: 'white'
    }}>
      
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>
          StudyMateHub 2.0 🧠
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '30px' }}>
          Enter a topic to generate your Engineering Knowledge Graph
        </p>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Machine Learning"
            style={{ 
              padding: '15px', 
              width: '300px', 
              borderRadius: '8px', 
              border: '1px solid #333',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <button 
            type="submit" 
            style={{ 
              padding: '15px 30px', 
              background: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '16px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Generate Map
          </button>
        </form>
      </div>

    </div>
  );
}

export default HomePage;