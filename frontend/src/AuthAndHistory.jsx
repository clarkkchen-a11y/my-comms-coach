import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup
} from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export function AuthUI() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px", marginBottom: "10px", 
    borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.05)", color: "inherit",
    boxSizing: 'border-box'
  };

  return (
    <div style={{ width: "100%", maxWidth: "320px", margin: "0 auto", padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", boxSizing: 'border-box' }}>
      <h2 style={{marginTop: 0}}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
      {error && <p style={{color: 'var(--accent-color)', fontSize: '0.85rem'}}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="btn-primary" style={{width: '100%', marginBottom: '10px'}}>
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
      <button onClick={handleGoogleSignIn} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', color: 'inherit', cursor: 'pointer', marginBottom: '10px'}}>
        Continue with Google
      </button>
      <button onClick={() => setIsLogin(!isLogin)} style={{background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', width: '100%'}}>
        {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
      </button>
    </div>
  );
}

function ScoreBar({ label, score, priority }) {
  if (score === undefined) return null;
  const color = priority ? "var(--accent-color)" : "rgba(255,255,255,0.7)";
  // Simple check for data-theme='light' to ensure contrast if needed, but rgba works nicely.
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '4px'}}>
      <span style={{width: '90px', color, fontWeight: priority ? 'bold' : 'normal'}}>{label}</span>
      <div style={{flex: 1, background: 'rgba(128,128,128,0.2)', height: '6px', borderRadius: '3px', overflow: 'hidden'}}>
        <div style={{width: `${score}%`, background: color, height: '100%'}} />
      </div>
      <span style={{width: '30px', textAlign: 'right', color, fontWeight: priority ? 'bold' : 'normal'}}>{score}</span>
    </div>
  );
}

export function SessionHistory({ user, scenarioId, onTargetedPracticeClick }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "sessions"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Optionally filter locally right here to avoid composite indexes error in FB
      const filtered = scenarioId ? data.filter(s => s.scenario_id === scenarioId) : data;
      setSessions(filtered);
    });
    return unsubscribe;
  }, [user, scenarioId]);

  if (sessions.length === 0) return <p style={{fontSize: "0.85rem", opacity: 0.7}}>No past sessions yet.</p>;

  return (
    <div style={{maxHeight: "300px", overflowY: "auto", textAlign: "left", display: 'flex', flexDirection: 'column', gap: '10px'}}>
      {sessions.map(s => (
        <div key={s.id} style={{padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
          <div style={{fontSize: "0.75rem", opacity: 0.6, marginBottom: '4px'}}>
            {s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'Recent'}
          </div>
          <p style={{margin: "4px 0", fontSize: "0.9rem", fontWeight: "bold"}}>{s.summary}</p>
          <ul style={{margin: "4px 0", paddingLeft: "20px", fontSize: "0.85rem", color: 'var(--accent-color)'}}>
            {s.tips?.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
          
          {s.is_targeted_practice ? (
            <div style={{marginTop: '12px', padding: '10px', background: 'rgba(128,128,128,0.1)', borderRadius: '8px'}}>
              <div style={{fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', opacity: 0.8}}>Shadowing Performance</div>
              <ScoreBar label={s.targeted_metric || "Action"} score={s.targeted_score} priority />
            </div>
          ) : (s.nativeness_score !== undefined) ? (
            <div style={{marginTop: '12px', padding: '10px', background: 'rgba(128,128,128,0.1)', borderRadius: '8px'}}>
              <div style={{fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', opacity: 0.8}}>MECE Performance Metrics</div>
              <ScoreBar label="Nativeness" score={s.nativeness_score} priority />
              <ScoreBar label="Fluency" score={s.fluency_score} />
              <ScoreBar label="Pronunciation" score={s.pronunciation_score} />
              <ScoreBar label="Pragmatics" score={s.pragmatic_score} />
              
              {s.suggested_practice_scenario && (
                <div style={{marginTop: '12px'}}>
                  <p style={{fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '8px', opacity: 0.8}}>
                    Target: "{s.suggested_practice_scenario}"
                  </p>
                  <button 
                    className="btn-primary" 
                    style={{width: '100%', padding: '8px', fontSize: '0.85rem'}}
                    onClick={() => onTargetedPracticeClick && onTargetedPracticeClick(s.suggested_practice_scenario)}
                  >
                    🎯 Start Targeted Practice
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
