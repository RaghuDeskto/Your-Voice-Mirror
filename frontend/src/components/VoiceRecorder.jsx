import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WaveSurfer from 'wavesurfer.js';
import MentorChat from './MentorChat';

const API_URL = 'http://localhost:3001/api';

function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [waveform, setWaveform] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [showChat, setShowChat] = useState(false);
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const [exampleText, setExampleText] = useState('Hello, my name is [Your Name]. Today I\'m going to talk about public speaking and how to improve your communication skills. Let me share some tips with you.');
  const speechSynthesisRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const waveformContainerRef = useRef(null);
  const waveformInstanceRef = useRef(null);
  const audioRef = useRef(null);

  const navigate = useNavigate();

  // Initialize waveform
  useEffect(() => {
    if (waveformContainerRef.current && !waveformInstanceRef.current) {
      const ws = WaveSurfer.create({
        container: waveformContainerRef.current,
        waveColor: '#0ea5e9',
        progressColor: '#0284c7',
        cursorColor: '#0369a1',
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 128,
        normalize: true,
      });

      waveformInstanceRef.current = ws;
      setWaveform(ws);

      ws.on('ready', () => {
        console.log('Waveform ready');
      });

      return () => {
        if (waveformInstanceRef.current) {
          waveformInstanceRef.current.destroy();
        }
      };
    }
  }, []);

  // Load audio to waveform
  useEffect(() => {
    if (recordedAudio && waveformInstanceRef.current) {
      const audioUrl = URL.createObjectURL(recordedAudio);
      waveformInstanceRef.current.load(audioUrl);
      
      return () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [recordedAudio, waveform]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const playRecording = () => {
    if (waveformInstanceRef.current) {
      if (waveformInstanceRef.current.isPlaying()) {
        waveformInstanceRef.current.pause();
      } else {
        waveformInstanceRef.current.play();
      }
    }
  };

  const analyzeRecording = async () => {
    if (!recordedAudio) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', recordedAudio, 'recording.webm');
      formData.append('duration', waveformInstanceRef.current?.getDuration() || 0);
      formData.append('sessionId', sessionId);

      const response = await fetch(`${API_URL}/analyze-voice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setShowChat(true);
    } catch (error) {
      console.error('Error analyzing recording:', error);
      alert('Failed to analyze recording. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startNewRecording = () => {
    setRecordedAudio(null);
    setAnalysis(null);
    setIsRecording(false);
    setIsPaused(false);
    setIsPlayingExample(false);
    if (waveformInstanceRef.current) {
      waveformInstanceRef.current.empty();
    }
    // Stop any playing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Play perfect example based on analysis
  const playPerfectExample = () => {
    if (!window.speechSynthesis) {
      alert('Your browser does not support text-to-speech. Please use a modern browser.');
      return;
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(exampleText);
    
    // Set perfect speaking parameters based on analysis feedback
    utterance.rate = 1.0; // Normal speed (0.5-2.0)
    utterance.pitch = 1.0; // Normal pitch (0-2)
    utterance.volume = 0.9; // Good volume (0-1)
    
    // If analysis exists, adjust based on user's issues
    if (analysis) {
      // Adjust speed based on user's speed
      if (analysis.speed === 'fast') {
        utterance.rate = 0.9; // Slightly slower to show perfect pace
      } else if (analysis.speed === 'slow') {
        utterance.rate = 1.0; // Normal pace
      } else {
        utterance.rate = 1.0; // Normal
      }
      
      // Adjust pitch for better modulation
      if (analysis.modulation === 'monotone' || analysis.modulation === 'needs-improvement') {
        // Use a voice with better modulation
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.gender === 'female' && v.lang.startsWith('en'));
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
      }
      
      // Add pauses - insert comma pauses for better rhythm
      const textWithPauses = exampleText
        .replace(/\./g, '. ')
        .replace(/,/g, ', ')
        .replace(/!/g, '! ');
      utterance.text = textWithPauses;
    }
    
    // Select a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Neural'))
    ) || voices.find(v => v.lang.startsWith('en-')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.lang = 'en-US';
    
    setIsPlayingExample(true);
    
    utterance.onend = () => {
      setIsPlayingExample(false);
    };
    
    utterance.onerror = () => {
      setIsPlayingExample(false);
      alert('Error playing example. Please try again.');
    };
    
    window.speechSynthesis.speak(utterance);
    speechSynthesisRef.current = window.speechSynthesis;
  };

  const stopPerfectExample = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingExample(false);
    }
  };

  // Load voices when component mounts
  useEffect(() => {
    if (window.speechSynthesis) {
      // Chrome needs this to load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log('Voices loaded:', voices.length);
        }
      };
      
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Dashboard →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Recording Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Voice Recording</h2>

              {/* Example Text Input */}
              <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Text for Perfect Example:
                </label>
                <textarea
                  value={exampleText}
                  onChange={(e) => setExampleText(e.target.value)}
                  placeholder="Enter the text you want to practice speaking..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  rows="3"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the text you recorded (or similar), then click "🎯 Listen to Perfect Example" to hear how it should be spoken.
                </p>
              </div>

              {/* Waveform */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-600">Your Recording Waveform</p>
                  {recordedAudio && (
                    <p className="text-xs text-gray-500">Compare with perfect example below</p>
                  )}
                </div>
                <div
                  ref={waveformContainerRef}
                  id="waveform"
                  className="bg-gray-50 rounded-lg p-4 border-2 border-primary-200"
                />
              </div>

              {/* Recording Controls */}
              <div className="flex flex-wrap gap-4 justify-center mb-6">
                {!isRecording && !recordedAudio && (
                  <button
                    onClick={startRecording}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                  >
                    🎤 Start Recording
                  </button>
                )}

                {isRecording && (
                  <>
                    <button
                      onClick={pauseRecording}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                      {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button
                      onClick={stopRecording}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                      ⏹ Stop
                    </button>
                  </>
                )}

                {recordedAudio && !isRecording && (
                  <>
                    <button
                      onClick={playRecording}
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                      ▶ Play Your Recording
                    </button>
                    <button
                      onClick={analyzeRecording}
                      disabled={isAnalyzing}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                      {isAnalyzing ? 'Analyzing...' : '📊 Analyze Recording'}
                    </button>
                    <button
                      onClick={startNewRecording}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                      🔄 New Recording
                    </button>
                  </>
                )}

                {/* Perfect Example Button - Always Available */}
                {exampleText.trim() && (
                  <button
                    onClick={isPlayingExample ? stopPerfectExample : playPerfectExample}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg"
                  >
                    {isPlayingExample ? '⏹ Stop Perfect Example' : '🎯 Listen to Perfect Example'}
                  </button>
                )}
              </div>

              {/* Comparison Section */}
              {recordedAudio && analysis && (
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-300">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📊 Compare Your Voice</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border-2 border-red-200">
                      <p className="text-sm font-semibold text-red-700 mb-2">🎤 Your Recording</p>
                      <button
                        onClick={playRecording}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
                      >
                        ▶ Play Your Voice
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                      <p className="text-sm font-semibold text-green-700 mb-2">⭐ Perfect Example</p>
                      <button
                        onClick={isPlayingExample ? stopPerfectExample : playPerfectExample}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
                      >
                        {isPlayingExample ? '⏹ Stop' : '▶ Play Perfect Example'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3 text-center">
                    💡 Listen to both and compare: Notice the differences in pace, clarity, modulation, and pauses!
                  </p>
                </div>
              )}

              {/* Analysis Results */}
              {analysis && (
                <div className="mt-6 p-6 bg-primary-50 rounded-lg border border-primary-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Detailed Analysis Results</h3>
                  
                  {/* Overall Confidence Score */}
                  <div className="mb-6 p-4 bg-white rounded-lg border-2 border-primary-300">
                    <p className="text-sm text-gray-600 mb-1">Overall Confidence Score</p>
                    <p className="text-4xl font-bold text-primary-700">{analysis.confidenceScore}/100</p>
                  </div>

                  {/* All Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {/* Tone */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-gray-600">Tone</p>
                        {analysis.ratings && (
                          <span className="text-xs font-semibold text-primary-700">
                            {analysis.ratings.tone}/100
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-primary-700 capitalize">{analysis.tone}</p>
                    </div>

                    {/* Speed */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-gray-600">Speed</p>
                        {analysis.ratings && (
                          <span className="text-xs font-semibold text-primary-700">
                            {analysis.ratings.speed}/100
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-primary-700 capitalize">{analysis.speed}</p>
                    </div>

                    {/* Clarity */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-gray-600">Clarity</p>
                        {analysis.ratings && (
                          <span className="text-xs font-semibold text-primary-700">
                            {analysis.ratings.clarity}/100
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-primary-700 capitalize">{analysis.clarity}</p>
                    </div>

                    {/* Volume */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-gray-600">Volume</p>
                        {analysis.ratings && (
                          <span className="text-xs font-semibold text-primary-700">
                            {analysis.ratings.volume}/100
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-primary-700 capitalize">
                        {analysis.volume?.replace('-', ' ') || 'N/A'}
                      </p>
                    </div>

                    {/* Pauses */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-gray-600">Pauses</p>
                        {analysis.ratings && (
                          <span className="text-xs font-semibold text-primary-700">
                            {analysis.ratings.pauses}/100
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-primary-700 capitalize">
                        {analysis.pauses?.replace('-', ' ') || 'N/A'}
                      </p>
                    </div>

                    {/* Modulation */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-gray-600">Modulation</p>
                        {analysis.ratings && (
                          <span className="text-xs font-semibold text-primary-700">
                            {analysis.ratings.modulation}/100
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-primary-700 capitalize">
                        {analysis.modulation?.replace('-', ' ') || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Suggestions */}
                  {analysis.suggestions && analysis.suggestions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">💡 Suggestions for Improvement:</p>
                      <ul className="list-disc list-inside text-gray-600 space-y-2">
                        {analysis.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI Mentor Chat Panel */}
          <div className="lg:col-span-1">
            <MentorChat sessionId={sessionId} analysis={analysis} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceRecorder;


