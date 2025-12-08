import { useState, useEffect } from 'react';

function AssessmentModal({ mainTopic, subTopic, onClose, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        const res = await fetch(`${baseUrl}/api/quiz?main_topic=${mainTopic}&sub_topic=${subTopic}`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
        } else {
            // Fallback Question
            setQuestions([{
                question: `What is the main concept of ${subTopic}?`,
                options: ["Fundamental Theory", "Advanced Application", "Obsolete Tech", "None of the above"],
                correct_answer: 0
            }]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [mainTopic, subTopic]);

  const handleAnswer = (optionIndex) => {
    if (optionIndex === questions[currentQ].correct_answer) {
      setScore(prev => prev + 1);
    }
    
    if (currentQ + 1 < questions.length) {
      setCurrentQ(prev => prev + 1);
    } else {
      setShowFeedback(true);
    }
  };

  const handleSubmit = () => {
    onComplete(score, feedbackText);
  };

  if (loading) {
    return (
        <div className="modal-overlay">
            <div className="spinner"></div>
            <h2 style={{color:'white', marginTop:'20px'}}>Generating Quiz for {subTopic}...</h2>
        </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        
        {!showFeedback ? (
          <>
            <h2 style={{marginBottom:'10px', color:'#007bff'}}>📝 Knowledge Check</h2>
            <h3 style={{marginTop:0, color:'#555'}}>{subTopic}</h3>
            
            <div style={{background:'#f1f3f5', padding:'20px', borderRadius:'10px', margin:'20px 0'}}>
                <h3 style={{margin:0}}>{questions[currentQ].question}</h3>
            </div>
            
            <div style={{display:'flex', flexDirection:'column'}}>
              {questions[currentQ].options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} className="modal-option-btn">
                  {opt}
                </button>
              ))}
            </div>
            
            <p style={{marginTop:'20px', color:'#999'}}>Question {currentQ + 1} of {questions.length}</p>
          </>
        ) : (
          <>
            <h1>🎉 Quiz Complete!</h1>
            <h2 style={{fontSize:'3rem', color: score >= 1 ? '#28a745' : '#dc3545', margin:'20px 0'}}>
                {score} / {questions.length}
            </h2>
            
            <p style={{fontSize:'1.2rem'}}>How confident do you feel about this topic?</p>
            <textarea 
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Type your thoughts here..."
              style={{width:'100%', height:'100px', padding:'15px', fontSize:'1rem', borderRadius:'10px', border:'1px solid #ccc', marginTop:'10px'}}
            />
            
            <div style={{display:'flex', justifyContent:'center', gap:'20px', marginTop:'30px'}}>
               <button onClick={onClose} style={{padding:'15px 30px', background:'#6c757d', color:'white', border:'none', borderRadius:'30px', fontSize:'1.2rem', cursor:'pointer'}}>
                 Retry / Cancel
               </button>
               <button onClick={handleSubmit} style={{padding:'15px 30px', background:'#007bff', color:'white', border:'none', borderRadius:'30px', fontSize:'1.2rem', cursor:'pointer'}}>
                 View Study Materials
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AssessmentModal;