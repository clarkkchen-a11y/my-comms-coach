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
    // In the future, we'll fetch the token from your Python/FastAPI backend here.
    // For now, we simulate starting the session.
    alert("Connection to backend required to fetch token. Run python backend server first!");
    // setToken("FETCHED_TOKEN");
    // setWsUrl("wss://YOUR_PROJECT.livekit.cloud");
    // setSessionActive(true);
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
                Level 1: Warehouse Loading Dock.<br />
                Your AI colleague, Lumina, is ready to chat.
              </p>
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
              <h1 className="title">Chatting with Lumina...</h1>
              
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
