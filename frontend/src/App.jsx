import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-styles';

function App() {
  const [theme, setTheme] = useState('dark');
  const [sessionActive, setSessionActive] = useState(false);
  const [token, setToken] = useState(''); // Will be fetched from your backend
  const [wsUrl, setWsUrl] = useState(''); // E.g., wss://my-comms-coach.livekit.cloud
  const [selectedVoice, setSelectedVoice] = useState('Aoede'); // Default Gemini Voice
  
  // VAD Parameters
  const [minSpeechDuration, setMinSpeechDuration] = useState(0.05);
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.55);

  // Toggle light/dark theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // On mount, set initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const startSession = async () => {
    try {
      const backendUrl = import.meta.env.PROD 
        ? "https://my-comms-coach-backend-161209776732.us-central1.run.app"
        : "http://localhost:8000";
      const resp = await fetch(`${backendUrl}/getToken?voice=${selectedVoice}&min_speech_duration=${minSpeechDuration}&min_silence_duration=${minSilenceDuration}`);
      if (!resp.ok) {
        throw new Error('Failed to fetch token from backend');
      }
      const data = await resp.json();
      setToken(data.accessToken);
      setWsUrl(data.url);
      setSessionActive(true);
    } catch (err) {
      console.error(err);
      alert("Connection failed. Is the python server running on port 8000?");
    }
  };

  const onDisconnected = () => {
    setSessionActive(false);
  };

  return (
    <>
      <header className="header">
        <div className="logo">My Comms Coach</div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </header>

      <main className="container">
        <div className="glass-panel">
          {!sessionActive ? (
            <div className="onboarding-view">
              <span className="status-badge disconnected">● Ready to Practice</span>
              <h1 className="title">Inspection Room</h1>
              <p className="subtitle">
                Communication Scenario Practice.<br />
                Your AI coach, Taylor, is ready to chat.
              </p>
              
              <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Choose Taylor's Voice:</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select 
                    value={selectedVoice} 
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "inherit",
                      border: "1px solid rgba(255,255,255,0.2)",
                      fontSize: "1rem",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Aoede" style={{color: "black"}}>Professional Female</option>
                    <option value="Charon" style={{color: "black"}}>Deep Male</option>
                    <option value="Fenrir" style={{color: "black"}}>Casual Male</option>
                    <option value="Kore" style={{color: "black"}}>Warm Female</option>
                    <option value="Puck" style={{color: "black"}}>Energetic Male</option>
                  </select>
                  
                  <button 
                    onClick={() => {
                      const audio = new Audio(`/voices/${selectedVoice}.wav`);
                      audio.play().catch(e => console.error("Error playing audio", e));
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--accent-color)",
                      color: "var(--accent-color)",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(100, 108, 255, 0.1)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    ▶ Play Sample
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px", width: "100%", maxWidth: "300px", padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px" }}>Tuning (VAD)</h3>
                
                <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                    <span>Speech Threshold</span>
                    <span>{minSpeechDuration}s</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="1.0" 
                    step="0.01" 
                    value={minSpeechDuration} 
                    onChange={(e) => setMinSpeechDuration(parseFloat(e.target.value))}
                    title="Minimum duration of speech to start a chunk"
                  />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                    <span>Silence Patience (Turn-Taking)</span>
                    <span>{minSilenceDuration}s</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="2.0" 
                    step="0.05" 
                    value={minSilenceDuration} 
                    onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                    title="How long to wait after you stop speaking before the AI responds"
                  />
                </div>
              </div>

              <button className="btn-primary" onClick={startSession}>
                Start Session
              </button>
            </div>
          ) : (
            <LiveKitRoom
              serverUrl={wsUrl}
              token={token}
              connect={true}
              audio={true}
              video={false}
              onDisconnected={onDisconnected}
            >
              <RoomAudioRenderer />
              
              <span className="status-badge connected">● Active Session</span>
              <h1 className="title">Chatting with Taylor...</h1>
              
              <ActiveSessionView />
              
              <VoiceAssistantControlBar />
            </LiveKitRoom>
          )}
        </div>
      </main>
    </>
  );
}

// Inner component to access the voice assistant state and visualize it
function ActiveSessionView() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="visualizer-wrapper">
      {/* The BarVisualizer uniquely visualizes the AI's audio return track */}
      <BarVisualizer
        state={state}
        barCount={7}
        trackRef={audioTrack}
      />
    </div>
  );
}

export default App;
