import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; // NEW
import remarkMath from 'remark-math';       // NEW
import rehypeKatex from 'rehype-katex';     // NEW
import 'katex/dist/katex.min.css';          // NEW

function AssessmentModal({ mainTopic, subTopic, onClose, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
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
            throw new Error("No data");
        }
      } catch (err) {
        // Fallback
        setQuestions([{ question: "Could not generate quiz. Check connection.", options: ["OK"], correct_answer: 0 }]);
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
      setQuizFinished(true);
    }
  };

  const handleSubmit = () => {
    onComplete(score, feedbackText);
  };

  const getDifficulty = (index) => {
      if (index < 2) return { label: "Easy", color: "#28a745" };
      if (index < 4) return { label: "Medium", color: "#ffc107" };
      return { label: "Hard 🔥", color: "#dc3545" };
  };

  if (loading) {
    return (
        <div className="modal-overlay" style={{ flexDirection: 'column' }}>
            <div className="spinner"></div>
            <h3 style={{color:'white', marginTop:'20px', fontWeight: '300'}}>Generating Challenge... 🧠</h3>
        </div>
    );
  }

  const difficulty = getDifficulty(currentQ);

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '700px', padding: '0', overflow: 'hidden', textAlign:'left' }}>
        
        {!quizFinished ? (
          <>
            <div style={{ padding: '20px 30px', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '1.1rem' }}>📝 {subTopic}</h3>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: difficulty.color, background: '#fff', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${difficulty.color}` }}>
                    {difficulty.label}
                </span>
            </div>
            
            <div style={{ width: '100%', height: '6px', background: '#eee' }}>
                <div style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, height: '100%', background: '#007bff', transition: 'width 0.3s ease' }}></div>
            </div>

            <div style={{ padding: '30px' }}>
                {/* RENDER QUESTION WITH MARKDOWN & MATH SUPPORT */}
                <div style={{ fontSize: '1.3rem', marginBottom: '25px', lineHeight: '1.6', color:'#222' }}>
                    <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                    >
                        {questions[currentQ].question}
                    </ReactMarkdown>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {questions[currentQ].options.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswer(i)} className="quiz-option">
                            <span style={{ fontWeight: 'bold', color: '#007bff', marginRight: '15px' }}>{String.fromCharCode(65 + i)}</span>
                            {/* Render Options with Math too */}
                            <span>
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {opt}
                                </ReactMarkdown>
                            </span>
                        </button>
                    ))}
                </div>
                
                <p style={{ marginTop: '20px', textAlign: 'right', color: '#999', fontSize: '0.9rem' }}>
                    Question {currentQ + 1} of {questions.length}
                </p>
            </div>
          </>
        ) : (
          /* RESULT SCREEN */
          <div style={{ padding: '40px', textAlign:'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                {score >= 3 ? "🏆" : "💪"}
            </div>
            <h1 style={{ margin: '10px 0', color: '#333' }}>
                {score >= 3 ? "Knowledge Verified!" : "Keep Learning!"}
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>
                You scored <strong>{score} / {questions.length}</strong> correct.
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
            <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', marginBottom: '10px', color: '#555' }}>
                How was this quiz? (Optional Feedback)
            </label>
            <textarea 
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
               <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#e9ecef', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
               <button onClick={handleSubmit} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#007bff', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                 {score >= 3 ? "Continue Path" : "View Resources"}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssessmentModal;