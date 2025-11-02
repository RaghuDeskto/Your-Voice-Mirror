import { Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import VoiceRecorder from './components/VoiceRecorder';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/record" element={<VoiceRecorder />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;


