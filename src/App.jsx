import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [userId, setUserId] = useState('');
  const [gameState, setGameState] = useState('login'); // login, fetching, playing, submitting, result
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);

  // Default values just in case .env is missing or invalid temporarily
  const API_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL || '';
  const PASS_THRESHOLD = parseInt(import.meta.env.VITE_PASS_THRESHOLD || 3);
  const QUESTION_COUNT = parseInt(import.meta.env.VITE_QUESTION_COUNT || 5);

  const startGame = async () => {
    if (!userId.trim()) {
      setError('PLEASE ENTER ID!');
      return;
    }
    setError(null);
    setGameState('fetching');
    
    try {
      const res = await fetch(`${API_URL}?action=getQuestions&count=${QUESTION_COUNT}`);
      const data = await res.json();
      
      if (data.success && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentQ(0);
        setAnswers({});
        setGameState('playing');
      } else {
        throw new Error(data.error || 'Failed to load questions.');
      }
    } catch (err) {
      setError(err.message || 'Network error / API Issue.');
      setGameState('login');
    }
  };

  const handleAnswer = (optionKey) => {
    const qId = questions[currentQ].id;
    const newAnswers = { ...answers, [qId]: optionKey };
    setAnswers(newAnswers);
    
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      submitAnswers(newAnswers);
    }
  };

  const submitAnswers = async (finalAnswers) => {
    setGameState('submitting');
    try {
      const payload = {
        id: userId,
        answers: finalAnswers,
        passThreshold: PASS_THRESHOLD
      };
      
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setResultData(data);
        setGameState('result');
      } else {
        throw new Error(data.error || 'Failed to submit.');
      }
    } catch (err) {
      setError(err.message || 'Network error');
      setGameState('login');
    }
  };

  const resetGame = () => {
    setGameState('login');
    setQuestions([]);
    setCurrentQ(0);
    setAnswers({});
    setResultData(null);
    setError(null);
  };

  return (
    <div className="pixel-panel">
      {gameState === 'login' && (
        <>
          <h1 className="title">PIXEL QUIZ QUEST</h1>
          <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=hero_start`} className="boss-img" alt="Hero" />
          <p>ENTER YOUR ID TO START</p>
          <input 
            type="text" 
            className="input-field" 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            placeholder="PLAYER ID"
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
          />
          {error && <p style={{color: 'var(--error)'}}>{error}</p>}
          <button className="btn primary" onClick={startGame}>INSERT COIN</button>
        </>
      )}

      {gameState === 'fetching' && (
        <div style={{minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <h2 className="blink">LOADING...</h2>
          <p style={{fontSize: '0.6rem', marginTop: '20px'}}>SUMMONING MONSTERS</p>
        </div>
      )}

      {gameState === 'submitting' && (
        <div style={{minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <h2 className="blink">CALCULATING...</h2>
          <p style={{fontSize: '0.6rem', marginTop: '20px'}}>SENDING TO GAS</p>
        </div>
      )}

      {gameState === 'playing' && questions.length > 0 && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '10px'}}>
             <span>PLAYER: {userId}</span>
             <span>Q: {currentQ + 1}/{questions.length}</span>
          </div>
          
          {/* Boss Image driven by Question ID and user ID */}
          <img 
            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=boss_${questions[currentQ].id}_${userId}`} 
            className="boss-img" 
            alt="Boss" 
          />
          
          <div className="question-text">
            {questions[currentQ].question}
          </div>
          
          <div className="options-container">
            {['A', 'B', 'C', 'D'].map(opt => (
              <button 
                key={opt}
                className="btn option-btn" 
                onClick={() => handleAnswer(opt)}
                disabled={!questions[currentQ].options[opt]}
              >
                {opt}. {questions[currentQ].options[opt]}
              </button>
            ))}
          </div>
        </>
      )}

      {gameState === 'result' && resultData && (
        <>
          <h1 className="title">{resultData.isPassed ? 'STAGE CLEAR' : 'GAME OVER'}</h1>
          <img 
            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${resultData.isPassed ? 'win' : 'lose'}_${userId}`} 
            className="boss-img" 
            alt="Result" 
          />
          
          <div className="stats">
            <p>SCORE: {resultData.score} / {questions.length}</p>
            <p>THRESHOLD: {PASS_THRESHOLD}</p>
            <p style={{color: resultData.isPassed ? 'var(--text-color)' : 'var(--error)'}}>
              {resultData.isPassed ? 'YOU PASSED! THE REALM IS SAFE!' : 'FAILED. TRY AGAIN!'}
            </p>
          </div>
          
          <button className="btn primary" onClick={resetGame} style={{marginTop: '30px'}}>
            CONTINUE ?
          </button>
        </>
      )}
    </div>
  )
}

export default App
