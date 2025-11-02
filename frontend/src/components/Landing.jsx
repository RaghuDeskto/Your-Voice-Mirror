import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-6xl md:text-7xl font-bold text-primary-700 mb-4 animate-fade-in">
          Your Voice Mirror
        </h1>
        <p className="text-2xl md:text-3xl text-primary-600 mb-12 font-light">
          Hear. Reflect. Transform.
        </p>
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          Improve your public speaking skills through AI-powered voice analysis 
          and personalized mentoring. Practice, receive feedback, and grow your confidence.
        </p>
        <button
          onClick={() => navigate('/record')}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Start Training
        </button>
      </div>
    </div>
  );
}

export default Landing;


