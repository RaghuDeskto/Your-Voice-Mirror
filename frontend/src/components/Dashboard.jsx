import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const API_URL = 'http://localhost:3001/api';

function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/sessions`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const allRecordings = sessions.flatMap(session => 
    session.recordings.map(rec => ({
      ...rec.analysis,
      date: new Date(rec.timestamp).toLocaleDateString(),
      timestamp: rec.timestamp,
    }))
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const confidenceData = {
    labels: allRecordings.map((_, idx) => `Session ${idx + 1}`),
    datasets: [
      {
        label: 'Confidence Score',
        data: allRecordings.map(r => r.confidenceScore),
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const toneDistribution = allRecordings.reduce((acc, rec) => {
    acc[rec.tone] = (acc[rec.tone] || 0) + 1;
    return acc;
  }, {});

  const toneData = {
    labels: Object.keys(toneDistribution),
    datasets: [
      {
        label: 'Tone Distribution',
        data: Object.values(toneDistribution),
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
        ],
      },
    ],
  };

  const metricComparison = {
    labels: ['Speed', 'Clarity', 'Volume', 'Pauses'],
    datasets: [
      {
        label: 'Average Score',
        data: [
          allRecordings.filter(r => r.speed === 'normal').length / allRecordings.length * 100,
          allRecordings.filter(r => r.clarity === 'excellent' || r.clarity === 'good').length / allRecordings.length * 100,
          allRecordings.filter(r => r.volume === 'good').length / allRecordings.length * 100,
          allRecordings.filter(r => r.pauses === 'adequate').length / allRecordings.length * 100,
        ],
        backgroundColor: 'rgba(14, 165, 233, 0.6)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-600 text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary-700">Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Home
            </button>
            <button
              onClick={() => navigate('/record')}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
            >
              New Recording
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600 mb-2">Total Sessions</p>
            <p className="text-3xl font-bold text-primary-700">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600 mb-2">Total Recordings</p>
            <p className="text-3xl font-bold text-primary-700">
              {sessions.reduce((acc, s) => acc + s.recordings.length, 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600 mb-2">Average Confidence</p>
            <p className="text-3xl font-bold text-primary-700">
              {allRecordings.length > 0
                ? Math.round(
                    allRecordings.reduce((acc, r) => acc + r.confidenceScore, 0) /
                      allRecordings.length
                  )
                : 0}
              /100
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600 mb-2">Last Session</p>
            <p className="text-lg font-semibold text-primary-700">
              {sessions.length > 0
                ? new Date(sessions[sessions.length - 1].createdAt).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Charts */}
        {allRecordings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Confidence Score Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Confidence Score Trend</h2>
              <div className="h-64">
                <Line data={confidenceData} options={chartOptions} />
              </div>
            </div>

            {/* Tone Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Tone Distribution</h2>
              <div className="h-64">
                <Doughnut data={toneData} options={chartOptions} />
              </div>
            </div>

            {/* Metric Comparison */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Metrics</h2>
              <div className="h-64">
                <Bar data={metricComparison} options={chartOptions} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-xl text-gray-600 mb-4">No recordings yet</p>
            <p className="text-gray-500 mb-6">Start recording to see your progress here!</p>
            <button
              onClick={() => navigate('/record')}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              Start Your First Recording
            </button>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Sessions</h2>
            <div className="space-y-4">
              {sessions.slice(-5).reverse().map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Session {session.id.split('-')[1]}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {session.recordings.length} recording(s)
                    </p>
                  </div>
                  {session.recordings.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">Latest Analysis:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Tone</p>
                          <p className="text-sm font-semibold capitalize">
                            {session.recordings[session.recordings.length - 1].analysis.tone}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Speed</p>
                          <p className="text-sm font-semibold capitalize">
                            {session.recordings[session.recordings.length - 1].analysis.speed}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Clarity</p>
                          <p className="text-sm font-semibold capitalize">
                            {session.recordings[session.recordings.length - 1].analysis.clarity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Confidence</p>
                          <p className="text-sm font-semibold">
                            {session.recordings[session.recordings.length - 1].analysis
                              .confidenceScore}
                            /100
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;


