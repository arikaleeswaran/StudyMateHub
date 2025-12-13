import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; 
import remarkMath from 'remark-math';       
import rehypeKatex from 'rehype-katex';     
import 'katex/dist/katex.min.css';          

function AssessmentModal({ mainTopic, subTopic, questionCount = 10, onClose, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const loadQuiz = async () => {
      setLoading(true);
      setScore(0);
      setCurrentQ(0);
      setQuizFinished(false);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
        // Send ?num=5 or ?num=10
        const res = await fetch(`${baseUrl}/api/quiz?main_topic=${mainTopic}&sub_topic=${subTopic}&num=${questionCount}`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
        } else {
            throw new Error("No data");
        }
      } catch (err) {
        setQuestions([{ question: "Could not generate quiz. Check connection.", options: ["OK"], correct_answer: 0 }]);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadQuiz();
  }, [mainTopic, subTopic, questionCount]);

  const handleAnswer = (optionIndex) => {
    if (optionIndex === questions[currentQ].correct_answer) {
      setScore(prev => prev + 1);
    }
    if (currentQ + 1 < questions.length) {
      setCurrentQ(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  // PASS MARK Logic: 60%
  const PASS_MARK = Math.ceil(questions.length * 0.6);
  const hasPassed = score >= PASS_MARK;

  const handleSubmit = () => {
    onComplete(score, feedbackText);
  };

  if (loading) {
    return (
        <div className="modal-overlay" style={{ flexDirection: 'column' }}>
            <div className="spinner"></div>
            <h3 style={{color:'white', marginTop:'20px', fontWeight: '300'}}>
                Generating {questionCount === 5 ? "Quick Check" : "Assessment"} ({questionCount} Qs)... 🧠
            </h3>
        </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '750px', padding: '0', overflow: 'hidden', textAlign:'left' }}>
        
        {!quizFinished ? (
          <>
            <div style={{ padding: '20px 30px', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '1.1rem' }}>📝 {questionCount === 5 ? "Diagnostic" : "Assessment"}: {subTopic}</h3>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#007bff', background: '#e3f2fd', padding: '4px 10px', borderRadius: '12px' }}>
                    Q{currentQ + 1}/{questions.length}
                </span>
            </div>
            
            <div style={{ width: '100%', height: '6px', background: '#eee' }}>
                <div style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, height: '100%', background: '#007bff', transition: 'width 0.3s ease' }}></div>
            </div>

            <div style={{ padding: '40px' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '25px', lineHeight: '1.6', color:'#222', fontWeight:'500' }}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {questions[currentQ].question}
                    </ReactMarkdown>
                </div>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                    {questions[currentQ].options.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswer(i)} className="quiz-option" style={{textAlign:'left', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', background:'white', cursor:'pointer', transition:'all 0.2s'}}>
                            <span style={{ fontWeight: 'bold', color: '#007bff', marginRight: '15px' }}>{String.fromCharCode(65 + i)}</span>
                            <span>{opt}</span>
                        </button>
                    ))}
                </div>
            </div>
          </>
        ) : (
          /* --- RESULT SCREEN --- */
          <div style={{ padding: '50px', textAlign:'center' }}>
            
            <div style={{ fontSize: '5rem', marginBottom: '20px' }}>
                {hasPassed ? "🏆" : "⚠️"}
            </div>
            
            <h1 style={{ margin: '0 0 10px 0', color: hasPassed ? '#28a745' : '#dc3545' }}>
                {hasPassed ? "Passed!" : "Assessment Failed"}
            </h1>
            
            <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>
                You scored <strong>{score} / {questions.length}</strong>.
                <br/>
                {hasPassed 
                    ? "Great job! You have verified your knowledge." 
                    : questionCount === 5 
                        ? "Shortcut Failed. You must view the resources and take the Full Assessment."
                        : "You need 60% to pass. Please review and retake."
                }
            </p>

            {hasPassed ? (
                // PASS UI
                <div>
                     <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', marginBottom: '10px', color: '#555' }}>Optional Feedback:</label>
                     <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ width: '100%', height: '60px', padding: '10px', marginBottom:'20px', borderRadius:'5px', border:'1px solid #ccc' }} placeholder="What did you learn?"/>
                     
                     <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#e9ecef', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>Close</button>
                        <button onClick={handleSubmit} style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>Complete Module ✅</button>
                     </div>
                </div>
            ) : (
                // FAIL UI
                <div style={{ display: 'flex', gap: '15px', justifyContent:'center' }}>
                    <button onClick={onClose} style={{ padding: '12px 30px', background: '#e9ecef', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>
                        {questionCount === 5 ? "Go to Resources 📚" : "Close"}
                    </button>
                    
                    {/* SHOW RETAKE ONLY FOR FULL (10Q) ASSESSMENT */}
                    {questionCount !== 5 && (
                        <button onClick={loadQuiz} style={{ padding: '12px 30px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>🔄 Retake Assessment</button>
                    )}
                </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default AssessmentModal;