# Your Voice Mirror 🎙️

**Hear. Reflect. Transform.**

A minimal MVP web application that helps users improve their public speaking skills through AI-powered voice analysis and personalized mentoring.

## Features

- 🎤 **Voice Recording** - Record your voice with real-time waveform visualization
- 📊 **Voice Analysis** - Get instant feedback on tone, speed, clarity, and confidence
- 🤖 **AI Mentor Chat** - Get personalized advice from an AI mentor
- 📈 **Progress Dashboard** - Track your improvement over time with charts and statistics

## Tech Stack

- **Frontend:** React + Vite + TailwindCSS + Wavesurfer.js + Chart.js
- **Backend:** Node.js + Express
- **AI:** OpenAI/DeepSeek API for mentor chat
- **Storage:** In-memory (temporary for MVP)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- OpenAI API key OR DeepSeek API key

### Installation

1. **Clone or navigate to the project directory**

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure Environment Variables**

   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3001
   OPENAI_API_KEY=your_openai_api_key_here
   # OR use DeepSeek:
   # DEEPSEEK_API_KEY=your_deepseek_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo
   # For DeepSeek use: deepseek-chat
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

   The server will run on `http://localhost:3001`

2. **Start the Frontend Development Server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

   The app will open at `http://localhost:3000`

## Project Structure

```
.
├── backend/
│   ├── server.js          # Express server with API endpoints
│   ├── package.json
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.jsx        # Landing page
│   │   │   ├── VoiceRecorder.jsx  # Recording interface
│   │   │   ├── MentorChat.jsx     # AI chat component
│   │   │   └── Dashboard.jsx      # Progress dashboard
│   │   ├── App.jsx                # Main app router
│   │   ├── main.jsx               # React entry point
│   │   └── index.css              # TailwindCSS styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

### `GET /api/health`
Health check endpoint

### `POST /api/analyze-voice`
Upload and analyze a voice recording
- **Body:** FormData with `audio` file, `duration`, and `sessionId`
- **Returns:** Analysis results (tone, speed, clarity, confidence score, suggestions)

### `POST /api/mentor-chat`
Chat with the AI mentor
- **Body:** `{ message: string, sessionId?: string }`
- **Returns:** `{ response: string }`

### `GET /api/sessions`
Get all recording sessions
- **Returns:** Array of sessions with recordings

### `GET /api/sessions/:sessionId`
Get a specific session
- **Returns:** Session details with all recordings

## Usage

1. **Landing Page** - Click "Start Training" to begin
2. **Record Your Voice** - Click the microphone button and speak
3. **Analyze** - Stop recording and click "Analyze Recording"
4. **Get Feedback** - View your analysis results and chat with the AI mentor
5. **Track Progress** - Visit the Dashboard to see your improvement over time

## Notes

- This is an **MVP** - voice analysis uses mock metrics for demonstration
- In production, you would integrate real speech-to-text and voice analysis APIs
- Data is stored in-memory and will be lost on server restart (no database)
- The AI mentor requires an OpenAI or DeepSeek API key to function

## License

MIT


