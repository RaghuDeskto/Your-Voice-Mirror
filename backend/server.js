import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client (works with OpenAI or DeepSeek)
// Prioritize DeepSeek if both keys exist
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || (process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com' : undefined);

const openai = apiKey ? new OpenAI({
  apiKey,
  ...(baseURL && { baseURL }),
}) : null;

// Log which API is being used
if (openai) {
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('✅ Using DeepSeek API');
  } else if (process.env.OPENAI_API_KEY) {
    console.log('✅ Using OpenAI API');
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for sessions (MVP - no database)
const sessions = new Map();

// Store conversation history per session
const conversationHistory = new Map();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Mock voice analysis function
function analyzeVoice(audioBuffer, duration) {
  // Mock analysis - in production, you'd use actual speech analysis APIs
  const tones = ['confident', 'nervous', 'calm', 'enthusiastic'];
  const speeds = ['slow', 'normal', 'fast'];
  const clarities = ['excellent', 'good', 'needs-improvement'];
  const volumes = ['too-quiet', 'good', 'too-loud'];
  const pausesList = duration > 30 ? ['adequate', 'good', 'excellent'] : ['too-few', 'adequate'];
  const modulations = ['monotone', 'needs-improvement', 'good', 'excellent'];

  const mockMetrics = {
    tone: tones[Math.floor(Math.random() * tones.length)],
    speed: speeds[Math.floor(Math.random() * speeds.length)],
    clarity: clarities[Math.floor(Math.random() * clarities.length)],
    volume: volumes[Math.floor(Math.random() * volumes.length)],
    pauses: pausesList[Math.floor(Math.random() * pausesList.length)],
    modulation: modulations[Math.floor(Math.random() * modulations.length)],
  };

  // Generate ratings (0-100) for each metric
  const ratings = {
    tone: mockMetrics.tone === 'confident' ? 85 : mockMetrics.tone === 'enthusiastic' ? 80 : mockMetrics.tone === 'calm' ? 75 : 60,
    speed: mockMetrics.speed === 'normal' ? 85 : mockMetrics.speed === 'slow' ? 70 : 65,
    clarity: mockMetrics.clarity === 'excellent' ? 90 : mockMetrics.clarity === 'good' ? 75 : 55,
    volume: mockMetrics.volume === 'good' ? 85 : mockMetrics.volume === 'too-loud' ? 70 : 60,
    pauses: mockMetrics.pauses === 'excellent' ? 90 : mockMetrics.pauses === 'good' ? 85 : mockMetrics.pauses === 'adequate' ? 75 : 55,
    modulation: mockMetrics.modulation === 'excellent' ? 90 : mockMetrics.modulation === 'good' ? 80 : mockMetrics.modulation === 'needs-improvement' ? 60 : 45,
  };

  // Generate suggestions based on metrics
  const suggestions = [];
  if (mockMetrics.speed === 'fast') {
    suggestions.push('Try slowing down slightly to improve clarity and impact.');
  }
  if (mockMetrics.tone === 'nervous') {
    suggestions.push('Practice deep breathing before speaking to project more confidence.');
  }
  if (mockMetrics.clarity === 'needs-improvement') {
    suggestions.push('Focus on enunciating each word clearly.');
  }
  if (mockMetrics.volume === 'too-quiet') {
    suggestions.push('Speak up to ensure your message is heard clearly.');
  }
  if (mockMetrics.volume === 'too-loud') {
    suggestions.push('Moderate your volume for better listener comfort.');
  }
  if (mockMetrics.pauses === 'too-few') {
    suggestions.push('Add more strategic pauses to emphasize key points and improve comprehension.');
  }
  if (mockMetrics.modulation === 'monotone' || mockMetrics.modulation === 'needs-improvement') {
    suggestions.push('Vary your pitch and intonation to make your speech more engaging and dynamic.');
  }

  // Calculate overall confidence score (0-100)
  let confidenceScore = Math.round(
    (ratings.tone * 0.2) + 
    (ratings.speed * 0.15) + 
    (ratings.clarity * 0.2) + 
    (ratings.volume * 0.15) + 
    (ratings.pauses * 0.15) + 
    (ratings.modulation * 0.15)
  );
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  return {
    ...mockMetrics,
    ratings, // Include individual ratings
    suggestions,
    confidenceScore,
    duration,
    timestamp: new Date().toISOString(),
  };
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Upload and analyze voice recording
app.post('/api/analyze-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const duration = parseFloat(req.body.duration) || 0;
    const sessionId = req.body.sessionId || `session-${Date.now()}`;

    // Perform mock analysis
    const analysis = analyzeVoice(req.file.buffer, duration);

    // Store session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        recordings: [],
        createdAt: new Date().toISOString(),
      });
      // Initialize conversation history for new session
      conversationHistory.set(sessionId, []);
    }

    const session = sessions.get(sessionId);
    const recording = {
      id: `recording-${Date.now()}`,
      analysis,
      timestamp: new Date().toISOString(),
    };
    session.recordings.push(recording);
    
    // Add analysis summary to conversation history automatically
    if (conversationHistory.has(sessionId)) {
      const history = conversationHistory.get(sessionId);
      const analysisSummary = `Your latest voice analysis shows: Tone: ${analysis.tone} (${analysis.ratings?.tone || 75}/100), Speed: ${analysis.speed} (${analysis.ratings?.speed || 75}/100), Clarity: ${analysis.clarity} (${analysis.ratings?.clarity || 75}/100), Volume: ${analysis.volume || 'good'} (${analysis.ratings?.volume || 75}/100), Pauses: ${analysis.pauses || 'adequate'} (${analysis.ratings?.pauses || 75}/100), Modulation: ${analysis.modulation || 'good'} (${analysis.ratings?.modulation || 75}/100). Overall Confidence: ${analysis.confidenceScore}/100.`;
      
      history.push({
        role: 'assistant',
        content: `Great! I've analyzed your recording. ${analysisSummary} ${analysis.suggestions && analysis.suggestions.length > 0 ? `Suggestions: ${analysis.suggestions.join(' ')}` : ''} Feel free to ask me specific questions about improving these areas!`,
      });
      conversationHistory.set(sessionId, history);
    }

    res.json({
      success: true,
      analysis,
      sessionId,
    });
  } catch (error) {
    console.error('Error analyzing voice:', error);
    res.status(500).json({ error: 'Failed to analyze voice recording' });
  }
});

// Get session history
app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  const allSessions = Array.from(sessions.values());
  res.json(allSessions);
});

// AI Mentor Chat
app.post('/api/mentor-chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize conversation history for session if not exists
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }

    // Get conversation history for this session
    const history = conversationHistory.get(sessionId) || [];

    // Get session context if available
    let context = '';
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      const latestRecording = session.recordings[session.recordings.length - 1];
      if (latestRecording) {
        const analysis = latestRecording.analysis;
        context = `Based on the latest voice analysis: tone: ${analysis.tone} (${analysis.ratings?.tone || 75}/100), speed: ${analysis.speed} (${analysis.ratings?.speed || 75}/100), clarity: ${analysis.clarity} (${analysis.ratings?.clarity || 75}/100), volume: ${analysis.volume || 'good'} (${analysis.ratings?.volume || 75}/100), pauses: ${analysis.pauses || 'adequate'} (${analysis.ratings?.pauses || 75}/100), modulation: ${analysis.modulation || 'good'} (${analysis.ratings?.modulation || 75}/100), confidence score: ${analysis.confidenceScore}/100.`;
      }
    }

    const systemPrompt = `You are an expert public speaking mentor and coach with years of experience. Your role is to provide highly specific, actionable, and personalized advice based on the user's actual voice analysis results.

${context ? `IMPORTANT - User's Latest Voice Analysis Results:
${context}

Use this specific data to give personalized advice. Reference their actual scores and ratings when providing tips.` : ''}

INSTRUCTIONS:
1. Always reference the user's actual analysis data when available
2. Give SPECIFIC, actionable tips (3-5 concrete steps) - NOT generic advice
3. Be encouraging but honest about areas needing improvement
4. Provide practical exercises or techniques they can practice immediately
5. If asked about a specific area (clarity, modulation, pauses, etc.), give detailed, relevant advice for THAT specific topic
6. Never give generic "practice regularly" responses - always be specific
7. Format responses with clear, numbered steps when giving improvement advice
8. Match your response tone to the question - if they ask about clarity, focus ONLY on clarity techniques

EXAMPLES:
- If user asks "how to improve clarity" → Give 5-6 specific clarity techniques: tongue twisters, enunciation exercises, slowing down specific sounds, consonant practice, etc.
- If user asks about modulation → Give specific pitch variation exercises, inflection techniques, voice dynamics practice
- Always relate back to their actual scores when possible

Be warm, mentor-like, and supportive. Responses should be 4-8 sentences for detailed questions, 2-3 for simple confirmations.`;

    // If no API key, use intelligent fallback responses
    if (!openai) {
      const lowerMessage = message.toLowerCase();
      let response = '';
      
      // Get latest analysis context
      let latestAnalysis = null;
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        if (session.recordings && session.recordings.length > 0) {
          latestAnalysis = session.recordings[session.recordings.length - 1].analysis;
        }
      }
      
      // Modulation specific questions
      if (lowerMessage.includes('modulation') || lowerMessage.includes('voice variation') || lowerMessage.includes('pitch')) {
        const currentModulation = latestAnalysis?.modulation || 'needs-improvement';
        response = `Great question about voice modulation! Based on your latest recording, your modulation is currently "${currentModulation}". `;
        
        if (currentModulation === 'monotone' || currentModulation === 'needs-improvement') {
          response += `Here's how to improve: 1) Vary your pitch when emphasizing key points - raise it for excitement, lower it for authority. 2) Use inflection to show emotion and engagement. 3) Practice reading aloud with exaggerated expression first, then tone it down. 4) Record yourself and listen - notice where your voice stays flat. 5) Try practicing with children's stories which naturally require expression.`;
        } else {
          response += `You're doing well! To maintain excellent modulation: Continue varying your pitch and pace. Use pauses strategically before important points. Match your voice tone to your message's emotion.`;
        }
      }
      // Pauses specific questions
      else if (lowerMessage.includes('pause') || lowerMessage.includes('pausing')) {
        const currentPauses = latestAnalysis?.pauses || 'adequate';
        response = `Excellent question about pauses! Your current pause quality is "${currentPauses}". `;
        
        if (currentPauses === 'too-few' || currentPauses === 'adequate') {
          response += `To improve: 1) Add strategic pauses after key points (2-3 seconds) to let information sink in. 2) Pause before important statements for emphasis. 3) Use pauses to replace filler words like "um" and "uh". 4) Count "one-Mississippi, two-Mississippi" silently to ensure pauses are long enough. 5) Practice reading with intentional pauses - mark them in your script if needed.`;
        } else {
          response += `Great work! You're using pauses effectively. Remember: Don't overuse them - balance is key. Vary pause length based on importance of the point being made.`;
        }
      }
      // Volume specific questions
      else if (lowerMessage.includes('volume') || lowerMessage.includes('loud') || lowerMessage.includes('quiet') || lowerMessage.includes('soft')) {
        const currentVolume = latestAnalysis?.volume || 'good';
        response = `Good question about volume! Your current volume level is "${currentVolume.replace('-', ' ')}". `;
        
        if (currentVolume === 'too-quiet') {
          response += `To improve: 1) Practice projecting from your diaphragm, not your throat. 2) Stand tall with good posture - it naturally increases volume. 3) Practice speaking to the back of the room. 4) Record yourself in different spaces to find optimal volume. 5) Ask a friend to sit at the back and signal if you need to speak louder.`;
        } else if (currentVolume === 'too-loud') {
          response += `To moderate: 1) Be aware of your audience's comfort - if they lean back, you're too loud. 2) Practice speaking softer while maintaining clarity. 3) Use a microphone if available for better control. 4) Check volume in the space before speaking. 5) Match your volume to the room size.`;
        } else {
          response += `Perfect! You're maintaining good volume. Remember to adjust based on room size and audience distance.`;
        }
      }
      // Tone specific questions
      else if (lowerMessage.includes('tone') || lowerMessage.includes('confident') || lowerMessage.includes('nervous') || lowerMessage.includes('calm')) {
        const currentTone = latestAnalysis?.tone || 'neutral';
        response = `About your speaking tone: Your latest recording shows "${currentTone}" tone. `;
        
        if (currentTone === 'nervous') {
          response += `To build confidence: 1) Practice deep breathing exercises (4-7-8 technique) before speaking. 2) Prepare thoroughly - knowledge builds confidence. 3) Start with smaller audiences and work your way up. 4) Visualize success before you speak. 5) Remember that most nervousness isn't visible to your audience.`;
        } else if (currentTone === 'confident' || currentTone === 'enthusiastic') {
          response += `Excellent! You're projecting confidence. Maintain this by continuing to prepare well and practice regularly.`;
        } else {
          response += `To develop a more confident tone: Focus on breathing, preparation, and practice. Your confidence will grow with each speaking opportunity.`;
        }
      }
      // Speed specific questions
      else if (lowerMessage.includes('speed') || lowerMessage.includes('fast') || lowerMessage.includes('slow') || lowerMessage.includes('pace') || lowerMessage.includes('rate')) {
        const currentSpeed = latestAnalysis?.speed || 'normal';
        response = `Regarding your speaking speed: Your current pace is "${currentSpeed}". `;
        
        if (currentSpeed === 'fast') {
          response += `To slow down: 1) Practice counting to 2 between sentences. 2) Use punctuation marks as pause indicators. 3) Record yourself and identify where you rush. 4) Practice reading at half your normal speed first. 5) Focus on clarity over speed - your audience needs time to process information.`;
        } else if (currentSpeed === 'slow') {
          response += `To pick up pace slightly: 1) Ensure you're not pausing too long between words. 2) Practice with a timer to find your natural pace. 3) Eliminate unnecessary filler words. 4) Maintain energy and engagement. However, slower is often better than too fast!`;
        } else {
          response += `Perfect! You're speaking at a good pace. Remember: Normal speed with good clarity is ideal for most audiences.`;
        }
      }
      // Clarity specific questions
      else if (lowerMessage.includes('clarity') || lowerMessage.includes('clear') || lowerMessage.includes('pronunciation') || lowerMessage.includes('enunciation') || lowerMessage.includes('improve clarity')) {
        const currentClarity = latestAnalysis?.clarity || 'good';
        const clarityRating = latestAnalysis?.ratings?.clarity || 75;
        response = `Excellent question about clarity! Your current clarity level is "${currentClarity}" with a rating of ${clarityRating}/100. `;
        
        if (currentClarity === 'needs-improvement' || clarityRating < 70) {
          response += `Here's your personalized improvement plan: 1) Daily tongue twisters (10 min) - Start with "She sells seashells", "Peter Piper picked", "Red leather yellow leather". 2) Over-enunciate practice - Say each word with exaggerated mouth movements, then record and compare. 3) Focus on consonant endings - Practice words ending in T, D, K, P clearly (like "act", "said", "think", "stop"). 4) Slow reading technique - Read aloud at 50% your normal speed, emphasizing every syllable. 5) Mirror practice - Watch your mouth movements while speaking to ensure clear articulation. 6) Word list practice - Create a list of 20 difficult words and practice them daily until clear. Your goal: reach "excellent" clarity (90+)!`;
        } else if (currentClarity === 'good' && clarityRating < 85) {
          response += `You're on the right track! To reach "excellent" level: 1) Advanced tongue twisters daily. 2) Practice with varied pace - slow for difficult words, normal for easy ones. 3) Record conversations and identify moments where clarity drops. 4) Practice articulation exercises focusing on consonant clusters (str, spr, thr sounds). 5) Read technical content aloud to challenge your articulation.`;
        } else {
          response += `Outstanding! Your clarity is at an excellent level. To maintain this: Continue daily tongue twisters as warm-up exercises. Practice with different content types (formal, casual, technical). Challenge yourself with fast-paced reading while maintaining clarity. Share techniques with others - teaching reinforces your skills.`;
        }
      }
      // General questions
      else {
        response = 'I\'m here to help you improve your public speaking! You can ask me about: tone, speed, clarity, volume, pauses, modulation, or confidence. Based on your latest recording, I can provide specific tips. (Note: Set DEEPSEEK_API_KEY in .env for even more personalized AI responses)';
        
        if (latestAnalysis) {
          response += ` Your latest analysis shows: Tone: ${latestAnalysis.tone}, Speed: ${latestAnalysis.speed}, Clarity: ${latestAnalysis.clarity}, Volume: ${latestAnalysis.volume || 'good'}, Pauses: ${latestAnalysis.pauses || 'adequate'}, Modulation: ${latestAnalysis.modulation || 'good'}. Ask me about any of these areas!`;
        }
      }
      
      return res.json({
        success: true,
        response,
      });
    }

    // Determine model - prioritize DeepSeek
    const model = process.env.DEEPSEEK_API_KEY 
      ? (process.env.OPENAI_MODEL || 'deepseek-chat') 
      : (process.env.OPENAI_MODEL || 'gpt-3.5-turbo');
    
    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10), // Keep last 10 messages for context (avoid token limit)
      { role: 'user', content: message },
    ];
    
    console.log(`Using model: ${model}, History length: ${history.length}, Messages: ${messages.length}`);
    
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 600,
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I cannot provide a response at this time.';

    // Save conversation history
    history.push(
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    );
    conversationHistory.set(sessionId, history);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Error in mentor chat:', error);
    console.error('Error details:', error.message);
    
    // Get user message and session context for fallback
    const { message: userMessage, sessionId: sessionIdForFallback } = req.body;
    const lowerMessage = (userMessage || '').toLowerCase();
    let fallbackResponse = '';
    
    // Get latest analysis for context
    let latestAnalysis = null;
    if (sessionIdForFallback && sessions.has(sessionIdForFallback)) {
      const session = sessions.get(sessionIdForFallback);
      if (session.recordings && session.recordings.length > 0) {
        latestAnalysis = session.recordings[session.recordings.length - 1].analysis;
      }
    }
    
    // Clarity specific questions
    if (lowerMessage.includes('clarity') || lowerMessage.includes('clear') || lowerMessage.includes('pronunciation') || lowerMessage.includes('enunciation') || lowerMessage.includes('improve clarity')) {
      const clarityRating = latestAnalysis?.ratings?.clarity || 75;
      const currentClarity = latestAnalysis?.clarity || 'good';
      fallbackResponse = `Excellent question about clarity! Your current clarity level is "${currentClarity}" with a rating of ${clarityRating}/100. Here's your personalized improvement plan: 1) Daily tongue twisters (10 min) - Start with "She sells seashells", "Peter Piper picked", "Red leather yellow leather". 2) Over-enunciate practice - Say each word with exaggerated mouth movements, then record and compare. 3) Focus on consonant endings - Practice words ending in T, D, K, P clearly (like "act", "said", "think", "stop"). 4) Slow reading technique - Read aloud at 50% your normal speed, emphasizing every syllable. 5) Mirror practice - Watch your mouth movements while speaking to ensure clear articulation. 6) Word list practice - Create a list of 20 difficult words and practice them daily until clear. Your goal: reach "excellent" clarity (90+)!`;
    }
    // Modulation specific
    else if (lowerMessage.includes('modulation') || lowerMessage.includes('voice variation') || lowerMessage.includes('pitch')) {
      const currentModulation = latestAnalysis?.modulation || 'needs-improvement';
      fallbackResponse = `Great question about voice modulation! Your current modulation is "${currentModulation}". Here's how to improve: 1) Vary your pitch when emphasizing key points - raise it for excitement, lower it for authority. 2) Use inflection to show emotion and engagement. 3) Practice reading aloud with exaggerated expression first, then tone it down. 4) Record yourself and listen - notice where your voice stays flat. 5) Try practicing with children's stories which naturally require expression. 6) Practice the "emotional scale" - say one sentence with 5 different emotions (happy, sad, angry, excited, calm).`;
    }
    // Pauses specific
    else if (lowerMessage.includes('pause') || lowerMessage.includes('pausing')) {
      const currentPauses = latestAnalysis?.pauses || 'adequate';
      fallbackResponse = `Excellent question about pauses! Your current pause quality is "${currentPauses}". To improve: 1) Add strategic pauses after key points (2-3 seconds) to let information sink in. 2) Pause before important statements for emphasis. 3) Use pauses to replace filler words like "um" and "uh". 4) Count "one-Mississippi, two-Mississippi" silently to ensure pauses are long enough. 5) Practice reading with intentional pauses - mark them in your script if needed.`;
    }
    // Volume specific
    else if (lowerMessage.includes('volume') || lowerMessage.includes('loud') || lowerMessage.includes('quiet') || lowerMessage.includes('soft')) {
      const currentVolume = latestAnalysis?.volume || 'good';
      fallbackResponse = `Good question about volume! Your current volume level is "${currentVolume.replace('-', ' ')}". To improve: 1) Practice projecting from your diaphragm, not your throat. 2) Stand tall with good posture - it naturally increases volume. 3) Practice speaking to the back of the room. 4) Record yourself in different spaces to find optimal volume. 5) Ask a friend to sit at the back and signal if you need to speak louder.`;
    }
    // Speed specific
    else if (lowerMessage.includes('speed') || lowerMessage.includes('fast') || lowerMessage.includes('slow') || lowerMessage.includes('pace') || lowerMessage.includes('rate')) {
      const currentSpeed = latestAnalysis?.speed || 'normal';
      fallbackResponse = `Regarding your speaking speed: Your current pace is "${currentSpeed}". To improve: 1) Practice counting to 2 between sentences. 2) Use punctuation marks as pause indicators. 3) Record yourself and identify where you rush. 4) Practice reading at half your normal speed first. 5) Focus on clarity over speed - your audience needs time to process information.`;
    }
    // Tone specific
    else if (lowerMessage.includes('tone') || lowerMessage.includes('confident') || lowerMessage.includes('nervous') || lowerMessage.includes('calm')) {
      const currentTone = latestAnalysis?.tone || 'neutral';
      fallbackResponse = `About your speaking tone: Your latest recording shows "${currentTone}" tone. To build confidence: 1) Practice deep breathing exercises (4-7-8 technique) before speaking. 2) Prepare thoroughly - knowledge builds confidence. 3) Start with smaller audiences and work your way up. 4) Visualize success before you speak. 5) Remember that most nervousness isn't visible to your audience.`;
    }
    // General fallback
    else {
      if (latestAnalysis) {
        fallbackResponse = `I'm here to help you improve your public speaking! Your latest analysis shows: Tone: ${latestAnalysis.tone}, Speed: ${latestAnalysis.speed}, Clarity: ${latestAnalysis.clarity}, Volume: ${latestAnalysis.volume || 'good'}, Pauses: ${latestAnalysis.pauses || 'adequate'}, Modulation: ${latestAnalysis.modulation || 'good'}, Confidence Score: ${latestAnalysis.confidenceScore}/100. Ask me specific questions about any of these areas - clarity, modulation, pauses, volume, speed, or tone - and I'll give you detailed, actionable advice!`;
      } else {
        fallbackResponse = `I'm here to help you improve your public speaking! Ask me specific questions about: tone, speed, clarity, volume, pauses, modulation, or confidence. I'll provide detailed, actionable tips for each area. (Note: Your API key seems invalid - please check your DEEPSEEK_API_KEY in backend/.env file. Meanwhile, I'm providing intelligent fallback responses based on your questions.)`;
      }
    }
    
    return res.json({
      success: true,
      response: fallbackResponse,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (openai) {
    console.log(`✅ AI Mentor enabled with API key`);
  } else {
    console.log(`⚠️  AI Mentor in fallback mode (no API key set)`);
    console.log(`📝 To enable full AI features, set OPENAI_API_KEY or DEEPSEEK_API_KEY in backend/.env`);
  }
});

