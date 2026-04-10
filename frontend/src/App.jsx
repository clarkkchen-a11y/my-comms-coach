import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthUI, SessionHistory } from './AuthAndHistory';

function App() {
  const [theme, setTheme] = useState('dark');
  const [sessionActive, setSessionActive] = useState(false);
  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  const [scenarioId, setScenarioId] = useState('1');
  const [customScenarioText, setCustomScenarioText] = useState("");
  
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [micSensitivity, setMicSensitivity] = useState('high');
  const [silenceDurationMs, setSilenceDurationMs] = useState(1000);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, [theme]);

  const startSession = async () => {
    try {
      const backendUrl = import.meta.env.PROD
        ? "https://my-comms-coach-backend-161209776732.us-central1.run.app"
        : "http://localhost:8000";
      
      const roomName = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const uidParam = user ? `&uid=${user.uid}` : '';
      const customScenarioParam = scenarioId === 'custom' ? `&custom_scenario_text=${encodeURIComponent(customScenarioText)}` : '';
      
      const resp = await fetch(
        `${backendUrl}/getToken?room=${roomName}&voice=${selectedVoice}&mic_sensitivity=${micSensitivity}&silence_duration_ms=${silenceDurationMs}&scenario_id=${scenarioId}${uidParam}${customScenarioParam}`
      );
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

  const speedLabel =
    silenceDurationMs <= 400 ? "Very Snappy" :
    silenceDurationMs <= 700 ? "Snappy" :
    silenceDurationMs <= 1200 ? "Balanced" :
    silenceDurationMs <= 1700 ? "Patient" :
    "Very Patient";

  const panelStyle = {
    marginBottom: "20px", display: "flex", flexDirection: "column", gap: "16px",
    width: "100%", maxWidth: "320px", margin: "0 auto 24px", boxSizing: "border-box"
  };

  const labelStyle = {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginBottom: "6px",
    display: "block",
  };

  const toggleGroupStyle = {
    display: "flex",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid var(--input-border)",
  };

  const toggleBtnStyle = (active) => ({
    flex: 1,
    padding: "8px 0",
    background: active ? "var(--accent-color)" : "transparent",
    color: active ? "white" : "var(--text-secondary)",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: active ? 600 : 400,
    transition: "all 0.2s",
  });

  if (loadingAuth) return <div style={{textAlign: 'center', padding: '50px'}}>Loading...</div>;

  return (
    <>
      <header className="header">
        <div className="logo">My Comms Coach</div>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          {user && (
            <button className="theme-toggle" onClick={() => signOut(auth)}>Sign Out</button>
          )}
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </header>

      <main className="container">
        <div className="glass-panel">
          {!user ? (
            <div className="onboarding-view">
              <h1 className="title" style={{marginBottom: '20px'}}>Sign in to Coach</h1>
              <AuthUI setUser={setUser} />
            </div>
          ) : !sessionActive ? (
            <div className="onboarding-view">
              <span className="status-badge disconnected">● Ready to Practice</span>
              
              <div style={panelStyle}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Select Scenario:</label>
                  <select
                    className="custom-select"
                    value={scenarioId}
                    onChange={(e) => setScenarioId(e.target.value)}
                    style={{
                      width: "100%", padding: "10px", borderRadius: "8px",
                      backgroundColor: "var(--input-bg)", color: "inherit",
                      border: "1px solid var(--input-border)", fontSize: "0.9rem"
                    }}
                  >
                    <option value="1">Scenario 1: The Loading Dock Chitchat</option>
                    <option value="2">Scenario 2: The Visual Inspection</option>
                    <option value="3">Scenario 3: The Assembly Guide</option>
                    <option value="4">Scenario 4: The Supplier Push-back</option>
                    <option value="custom">Create Custom Scenario...</option>
                  </select>
                  
                  {scenarioId === "custom" && (
                    <div style={{ marginTop: "10px" }}>
                      <textarea
                        value={customScenarioText}
                        onChange={(e) => setCustomScenarioText(e.target.value)}
                        placeholder="E.g., I need to practice delivering negative feedback to a team member about their recent performance..."
                        style={{
                          width: "100%", height: "80px", padding: "10px", borderRadius: "8px",
                          backgroundColor: "var(--input-bg)", color: "inherit",
                          border: "1px solid var(--input-border)", fontSize: "0.85rem",
                          resize: "vertical"
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Choose Taylor's Voice:</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select
                    className="custom-select"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    style={{
                      padding: "8px 16px", borderRadius: "8px", backgroundColor: "var(--input-bg)",
                      color: "inherit", border: "1px solid var(--input-border)", fontSize: "1rem", cursor: "pointer"
                    }}
                  >
                    <option value="Aoede">Professional Female</option>
                    <option value="Charon">Deep Male</option>
                    <option value="Fenrir">Casual Male</option>
                    <option value="Kore">Warm Female</option>
                    <option value="Puck">Energetic Male</option>
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

              {/* Conversation Settings */}
              <div style={panelStyle}>
                <h3 style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  margin: "0 0 16px 0",
                  paddingBottom: "10px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)"
                }}>
                  Conversation Settings
                </h3>

                {/* Mic Sensitivity */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Microphone Sensitivity
                    <span className="tooltip-wrapper">
                      <span className="tooltip-icon">?</span>
                      <span className="tooltip-bubble">High = detects voice more easily. Low = filters background noise.</span>
                    </span>
                  </label>
                  <div style={{ ...toggleGroupStyle, marginTop: "8px" }}>
                    <button
                      style={toggleBtnStyle(micSensitivity === 'high')}
                      onClick={() => setMicSensitivity('high')}
                    >
                      High
                    </button>
                    <button
                      style={toggleBtnStyle(micSensitivity === 'low')}
                      onClick={() => setMicSensitivity('low')}
                    >
                      Low
                    </button>
                  </div>
                </div>

                {/* Response Patience */}
                <div>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Silence Patience (Turn-Taking)
                    <span className="tooltip-wrapper">
                      <span className="tooltip-icon">?</span>
                      <span className="tooltip-bubble">Snappy = Taylor interrupts quicker. Patient = Taylor gives you more time to think mid-sentence.</span>
                    </span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Snappy</span>
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="100"
                      value={silenceDurationMs}
                      onChange={(e) => setSilenceDurationMs(parseInt(e.target.value))}
                      style={{ flex: 1 }}
                      title="Lower = Taylor responds faster. Higher = Taylor gives you more time to pause mid-thought."
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Patient</span>
                  </div>
                  <div style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-color)", marginTop: "4px" }}>
                    {speedLabel} ({(silenceDurationMs / 1000).toFixed(1)}s pause)
                  </div>
                </div>
              </div>

              <button className="btn-primary" style={{marginTop: '20px'}} onClick={startSession}>
                Start Session
              </button>
            </div>
          ) : (
            <LiveKitRoom
              serverUrl={wsUrl}
              token={token}
              connect={true}
              audio={{
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }}
              video={false}
              onDisconnected={onDisconnected}
            >
              <RoomAudioRenderer />
              <span className="status-badge connected">● Active Session</span>
              <h1 className="title">Chatting with Lumina...</h1>
              <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px'}}>
                Roleplay is active. Don't forget to ask for a redo to practice the feedback!
              </p>
              <ActiveSessionView />
              <VoiceAssistantControlBar />
            </LiveKitRoom>
          )}
        </div>

        {token === "" && user && (
          <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", marginTop: "20px", padding: "2rem" }}>
            <h3 style={{fontSize: "1.1rem", margin: "0 0 16px 0", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>
              <span style={{ fontSize: '1.4rem' }}>📚</span> 
              {scenarioId === "custom" ? "Your Custom Scenario History" : `Past History: Scenario ${scenarioId}`}
            </h3>
            <SessionHistory user={user} scenarioId={scenarioId} />
          </div>
        )}
      </main>
    </>
  );
}

function ActiveSessionView() {
  const { state, audioTrack } = useVoiceAssistant();
  return (
    <div className="visualizer-wrapper">
      <BarVisualizer state={state} barCount={7} trackRef={audioTrack} />
    </div>
  );
}

export default App;
