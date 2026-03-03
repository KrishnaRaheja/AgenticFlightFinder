import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PreferenceCard from '../components/PreferenceCard';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get the current session and access token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error('Failed to get session: ' + sessionError.message);
        }
        
        if (!session) {
          throw new Error('No active session');
        }
        
        // Fetch preferences from backend with authorization header
        const response = await fetch('http://localhost:8000/api/preferences', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch preferences: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPreferences(data);
      } catch (err) {
        console.error('Error fetching preferences:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPreferences();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const activePreferences = preferences.filter((preference) => preference.is_active);
  const inactivePreferences = preferences.filter((preference) => !preference.is_active);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Flight Deal Finder</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Your Flight Preferences</h2>
          <p className="text-gray-600 mb-6">
            Create and manage your flight deal preferences here.
          </p>

          <button
            onClick={() => navigate('/create')}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
          >
            Create New Preference
          </button>

          <div className="mt-8">
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-gray-600 mt-4">Loading your preferences...</p>
              </div>
            )}
            
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">Error: {error}</p>
              </div>
            )}
            
            {!loading && preferences.length === 0 && (
              <p className="text-gray-500">No preferences yet. Create your first one!</p>
            )}
            
            {!loading && preferences.length > 0 && (
              <div className="space-y-4">
                {/* Active Preferences Section */}
                {activePreferences.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setActiveExpanded(!activeExpanded)}
                      className="w-full bg-green-50 hover:bg-green-100 p-4 flex justify-between items-center transition"
                    >
                      <h3 className="text-lg font-semibold text-green-700">
                        Active Preferences ({activePreferences.length})
                      </h3>
                      <svg className={`w-6 h-6 text-green-700 transition-transform ${activeExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeExpanded && (
                      <div className="p-4 space-y-3 bg-white">
                        {activePreferences.map((preference) => (
                          <PreferenceCard
                            key={preference.id}
                            preference={preference}
                            isExpanded={expandedId === preference.id}
                            onToggle={() =>
                              setExpandedId(expandedId === preference.id ? null : preference.id)
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Inactive Preferences Section */}
                {inactivePreferences.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setInactiveExpanded(!inactiveExpanded)}
                      className="w-full bg-gray-100 hover:bg-gray-200 p-4 flex justify-between items-center transition"
                    >
                      <h3 className="text-lg font-semibold text-gray-700">
                        Inactive Preferences ({inactivePreferences.length})
                      </h3>
                      <svg className={`w-6 h-6 text-gray-700 transition-transform ${inactiveExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {inactiveExpanded && (
                      <div className="p-4 space-y-3 bg-white">
                        {inactivePreferences.map((preference) => (
                          <PreferenceCard
                            key={preference.id}
                            preference={preference}
                            isExpanded={expandedId === preference.id}
                            onToggle={() =>
                              setExpandedId(expandedId === preference.id ? null : preference.id)
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
