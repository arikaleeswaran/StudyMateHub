import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; 
import remarkMath from 'remark-math';       
import rehypeKatex from 'rehype-katex';     
import 'katex/dist/katex.min.css';          
import { FaCheckCircle, FaTimesCircle, FaArrowRight } from 'react-icons/fa';

function AssessmentModal({ mainTopic, subTopic, questionCount = 10, onClose, onComplete, onRetry }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  // ✅ NEW: State for Instant Feedback
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const loadQuiz = async () => {
      setLoading(true);
      setScore(0);
      setCurrentQ(0);
      setQuizFinished(false);
      setIsAnswered(false);      // Reset
      setSelectedOption(null);   // Reset
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
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

  // ✅ HANDLE SELECTION (Don't advance yet)
  const handleAnswer = (optionIndex) => {
    if (isAnswered) return; // Prevent changing answer
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);

    if (optionIndex === questions[currentQ].correct_answer) {
      setScore(prev => prev + 1);
    }
  };

  // ✅ HANDLE NEXT QUESTION
  const handleNext = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    
    if (currentQ + 1 < questions.length) {
      setCurrentQ(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const PASS_MARK = Math.ceil(questions.length * 0.6);
  const hasPassed = score >= PASS_MARK;

  const handleSubmit = () => {
    onComplete(score, feedbackText);
  };

  const handleRetakeSelf = () => loadQuiz();
  const handleSwitchToFull = () => { if (onRetry) onRetry(); };

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

  // Helper to determine button style based on answer state
  const getOptionStyle = (index) => {
      const isSelected = selectedOption === index;
      const isCorrect = index === questions[currentQ].correct_answer;
      
      if (!isAnswered) {
          // Default State
          return { background: 'white', border: '1px solid #ddd', color: '#333' };
      }

      if (isCorrect) {
          // ✅ Always highlight the correct answer in Green
          return { background: '#d4edda', border: '1px solid #28a745', color: '#155724' };
      }

      if (isSelected && !isCorrect) {
          // ❌ Highlight wrong selection in Red
          return { background: '#f8d7da', border: '1px solid #dc3545', color: '#721c24' };
      }

      // Fade out other unselected options
      return { background: '#f9f9f9', border: '1px solid #eee', color: '#aaa', opacity: 0.6 };
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '750px', padding: '0', overflow: 'hidden', textAlign:'left' }}>
        
        {!quizFinished ? (
          /* --- QUESTION UI --- */
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

            <div style={{ padding: '40px 40px 20px 40px' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '25px', lineHeight: '1.6', color:'#222', fontWeight:'500' }}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {questions[currentQ].question}
                    </ReactMarkdown>
                </div>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                    {questions[currentQ].options.map((opt, i) => {
                        const style = getOptionStyle(i);
                        return (
                            <button 
                                key={i} 
                                onClick={() => handleAnswer(i)} 
                                disabled={isAnswered} // 🔒 Lock buttons after answering
                                style={{
                                    textAlign:'left', padding:'15px', borderRadius:'8px', cursor: isAnswered ? 'default' : 'pointer',
                                    transition:'all 0.2s', display:'flex', justifyContent:'space-between', alignItems:'center',
                                    ...style
                                }}
                            >
                                <div>
                                    <span style={{ fontWeight: 'bold', marginRight: '15px', opacity: 0.7 }}>{String.fromCharCode(65 + i)}</span>
                                    <span>{opt}</span>
                                </div>
                                {/* Icon for feedback */}
                                {isAnswered && i === questions[currentQ].correct_answer && <FaCheckCircle color="#28a745"/>}
                                {isAnswered && selectedOption === i && i !== questions[currentQ].correct_answer && <FaTimesCircle color="#dc3545"/>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ✅ NEXT BUTTON AREA (Only visible after answering) */}
            <div style={{ height: '80px', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {isAnswered && (
                    <button onClick={handleNext} style={{
                        padding: '12px 30px', background: '#007bff', color: 'white', border: 'none', borderRadius: '30px',
                        fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: '0 4px 12px rgba(0,123,255,0.3)', animation: 'fadeIn 0.3s'
                    }}>
                        {currentQ + 1 === questions.length ? "Finish Quiz" : "Next Question"} <FaArrowRight/>
                    </button>
                )}
            </div>
          </>
        ) : (
          /* --- RESULT UI (Keep Existing Logic) --- */
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
                {hasPassed ? "Great job! Knowledge verified." : "You need 60% to pass."}
            </p>

            {hasPassed ? (
                <div>
                     <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', marginBottom: '10px', color: '#555' }}>Optional Feedback:</label>
                     <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ width: '100%', height: '60px', padding: '10px', marginBottom:'20px', borderRadius:'5px', border:'1px solid #ccc' }} placeholder="What did you learn?"/>
                     <button onClick={handleSubmit} style={{ width: '100%', padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold', fontSize:'1.1rem' }}>Complete Module ✅</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems:'center' }}>
                    <div style={{display:'flex', gap:'10px', width:'100%'}}>
                        <button onClick={handleRetakeSelf} style={{ flex:1, padding: '12px', background: '#e9ecef', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>
                            🔄 Retake
                        </button>
                        {questionCount === 5 && (
                            <button onClick={handleSwitchToFull} style={{ flex:1, padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>
                                🎓 Take Full Exam
                            </button>
                        )}
                    </div>
                    <button onClick={handleSubmit} style={{ background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', marginTop:'10px' }}>
                        Close & Save Progress
                    </button>
                </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default AssessmentModal;