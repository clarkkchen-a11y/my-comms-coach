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
  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');

  // mic_sensitivity: "high" = picks up voice easily, "low" = needs louder/clearer speech
  const [micSensitivity, setMicSensitivity] = useState('high');
  // silence_duration_ms: how many ms of silence before Taylor responds
  const [silenceDurationMs, setSilenceDurationMs] = useState(1000);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const startSession = async () => {
    try {
      const backendUrl = import.meta.env.PROD
        ? "https://my-comms-coach-backend-161209776732.us-central1.run.app"
        : "http://localhost:8000";
      // Use a unique room name per session so LiveKit dispatches a fresh agent job
      const roomName = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const resp = await fetch(
        `${backendUrl}/getToken?room=${roomName}&voice=${selectedVoice}&mic_sensitivity=${micSensitivity}&silence_duration_ms=${silenceDurationMs}`
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

  // Human-readable response speed label
  const speedLabel =
    silenceDurationMs <= 400 ? "Very Snappy" :
    silenceDurationMs <= 700 ? "Snappy" :
    silenceDurationMs <= 1200 ? "Balanced" :
    silenceDurationMs <= 1700 ? "Patient" :
    "Very Patient";

  const panelStyle = {
    marginBottom: "24px",
    width: "100%",
    maxWidth: "320px",
    padding: "16px 20px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const labelStyle = {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginBottom: "6px",
    display: "block",
  };

  const hintStyle = {
    fontSize: "0.75rem",
    opacity: 0.55,
    marginTop: "2px",
    display: "block",
  };

  const toggleGroupStyle = {
    display: "flex",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.15)",
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

              {/* Voice Selection */}
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

              {/* Conversation Settings — static, not floating */}
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
                    Response Speed
                    <span className="tooltip-wrapper">
                      <span className="tooltip-icon">?</span>
                      <span className="tooltip-bubble">Snappy = Taylor responds quickly. Patient = more pause time mid-thought.</span>
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

function ActiveSessionView() {
  const { state, audioTrack } = useVoiceAssistant();
  return (
    <div className="visualizer-wrapper">
      <BarVisualizer state={state} barCount={7} trackRef={audioTrack} />
    </div>
  );
}

export default App;
