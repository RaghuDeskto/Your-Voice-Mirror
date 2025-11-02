import { useState, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function MentorChat({ sessionId, analysis }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI speaking mentor. I'm here to help you improve your public speaking skills. Ask me anything!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (analysis) {
      const metrics = [
        `Tone: ${analysis.tone}${analysis.ratings?.tone ? ` (${analysis.ratings.tone}/100)` : ''}`,
        `Speed: ${analysis.speed}${analysis.ratings?.speed ? ` (${analysis.ratings.speed}/100)` : ''}`,
        `Clarity: ${analysis.clarity}${analysis.ratings?.clarity ? ` (${analysis.ratings.clarity}/100)` : ''}`,
        `Volume: ${(analysis.volume || 'good').replace('-', ' ')}${analysis.ratings?.volume ? ` (${analysis.ratings.volume}/100)` : ''}`,
        `Pauses: ${(analysis.pauses || 'adequate').replace('-', ' ')}${analysis.ratings?.pauses ? ` (${analysis.ratings.pauses}/100)` : ''}`,
        `Modulation: ${(analysis.modulation || 'good').replace('-', ' ')}${analysis.ratings?.modulation ? ` (${analysis.ratings.modulation}/100)` : ''}`,
      ].join(', ');
      
      const analysisMessage = {
        role: 'assistant',
        content: `Great! I've reviewed your latest recording. Your analysis shows: ${metrics}. Overall Confidence Score: ${analysis.confidenceScore}/100. ${analysis.suggestions && analysis.suggestions.length > 0 ? `\n\n💡 Suggestions: ${analysis.suggestions.join(' ')}` : ''}\n\nFeel free to ask me specific questions about any of these areas - tone, speed, clarity, volume, pauses, or modulation!`,
      };
      setMessages(prev => [...prev, analysisMessage]);
    }
  }, [analysis]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/mentor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.response,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please make sure the backend server is running and try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-[calc(100vh-8rem)] flex flex-col">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Mentor</h2>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-600">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask your mentor..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default MentorChat;


