import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../config';
import PreferenceCard from '../components/PreferenceCard';
import AlertsModal from '../components/AlertsModal';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [selectedPreference, setSelectedPreference] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');

  // Fade-in animation on mount
  useEffect(() => {
    setFadeIn(true);
  }, []);

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
        const response = await fetch(`${API_URL}/api/preferences/`, {
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

  const handleTogglePreferenceStatus = async (preferenceId, nextIsActive) => {
    try {
      setStatusUpdatingId(preferenceId);
      setError('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_URL}/api/preferences/${preferenceId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: nextIsActive })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update preference status');
      }

      const updatedPreference = await response.json();

      setPreferences((currentPreferences) =>
        currentPreferences.map((preference) =>
          preference.id === updatedPreference.id ? updatedPreference : preference
        )
      );
    } catch (err) {
      console.error('Error updating preference status:', err);
      setError(err.message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleViewAlerts = async (preference) => {
    try {
      setSelectedPreference(preference);
      setAlertsOpen(true);
      setAlerts([]);
      setAlertsError('');
      setAlertsLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_URL}/api/preferences/${preference.id}/alerts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to load alerts');
      }

      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setAlertsError(err.message);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleCloseAlerts = () => {
    setAlertsOpen(false);
    setSelectedPreference(null);
    setAlerts([]);
    setAlertsError('');
    setAlertsLoading(false);
  };

  const activePreferences = preferences.filter((preference) => preference.is_active);
  const inactivePreferences = preferences.filter((preference) => !preference.is_active);

  return (
    <div className="min-h-screen bg-botanical-bg">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-page {
          animation: fadeIn 0.6s ease-out;
        }

        .fade-in-card {
          animation: fadeIn 0.5s ease-out;
        }

        .preference-card-item {
          animation: slideInDown 0.3s ease-out;
        }

        .smooth-button-transition {
          transition: all 0.2s ease-out;
        }

        .smooth-button-transition:hover {
          transform: translateY(-1px);
        }

        .smooth-button-transition:active {
          transform: translateY(1px);
        }
      `}</style>

      <Navbar />

      <div className={`container mx-auto p-8 ${fadeIn ? 'fade-in-page' : ''}`}>
        <div className={`bg-white rounded-lg shadow-lg p-6 ${fadeIn ? 'fade-in-card' : ''}`}>
          <h2 className="text-2xl font-bold mb-4 text-botanical-subtext">Your Flight Preferences</h2>
          <p className="text-botanical-subtext mb-6">
            We regularly check prices and notify you about deals at <span className="font-bold text-botanical-subtext">{user?.email}</span>.
          </p>

          <button
            onClick={() => navigate('/create')}
            className="bg-botanical-accent text-botanical-subtext px-6 py-3 rounded hover:bg-[#9ab5b3] cursor-pointer font-medium smooth-button-transition"
          >
            Create New Preference
          </button>

          <div className="mt-8">
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-botanical-accent"></div>
                </div>
                <p className="text-botanical-subtext mt-4">Loading your preferences...</p>
              </div>
            )}
            
            {error && !loading && (
              <div className="bg-botanical-error border border-botanical-error-text rounded-lg p-4 mb-6">
                <p className="text-botanical-error-text">Error: {error}</p>
              </div>
            )}
            
            {!loading && preferences.length === 0 && (
              <p className="text-botanical-subtext">No preferences yet. Create your first one!</p>
            )}
            
            {!loading && preferences.length > 0 && (
              <div className="space-y-4">
                {/* Active Preferences Section */}
                <div className="border border-botanical-accent rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveExpanded(!activeExpanded)}
                    className="w-full bg-botanical-accent/20 hover:bg-botanical-accent/30 p-4 flex justify-between items-center transition smooth-button-transition cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold text-botanical-subtext">
                      Active Preferences ({activePreferences.length})
                    </h3>
                    <svg className={`w-6 h-6 text-botanical-subtext transition-transform duration-300 ${activeExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {activeExpanded && (
                    <div className="p-4 space-y-3 bg-white">
                      {activePreferences.length > 0 ? (
                        activePreferences.map((preference, index) => (
                          <div key={preference.id} className="preference-card-item" style={{ animationDelay: `${index * 0.1}s` }}>
                            <PreferenceCard
                              preference={preference}
                              isExpanded={expandedId === preference.id}
                              isStatusUpdating={statusUpdatingId === preference.id}
                              onToggle={() =>
                                setExpandedId(expandedId === preference.id ? null : preference.id)
                              }
                              onToggleActiveStatus={(nextIsActive) =>
                                handleTogglePreferenceStatus(preference.id, nextIsActive)
                              }
                              onViewAlerts={() => handleViewAlerts(preference)}
                            />
                          </div>
                        ))
                      ) : (
                        <p className="text-botanical-subtext">No active preferences.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Inactive Preferences Section */}
                <div className="border border-botanical-accent rounded-lg overflow-hidden">
                  <button
                    onClick={() => setInactiveExpanded(!inactiveExpanded)}
                    className="w-full bg-botanical-accent/20 hover:bg-botanical-accent/30 p-4 flex justify-between items-center transition smooth-button-transition cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold text-botanical-subtext">
                      Inactive Preferences ({inactivePreferences.length})
                    </h3>
                    <svg className={`w-6 h-6 text-botanical-subtext transition-transform duration-300 ${inactiveExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {inactiveExpanded && (
                    <div className="p-4 space-y-3 bg-white">
                      {inactivePreferences.length > 0 ? (
                        inactivePreferences.map((preference, index) => (
                          <div key={preference.id} className="preference-card-item" style={{ animationDelay: `${index * 0.1}s` }}>
                            <PreferenceCard
                              preference={preference}
                              isExpanded={expandedId === preference.id}
                              isStatusUpdating={statusUpdatingId === preference.id}
                              onToggle={() =>
                                setExpandedId(expandedId === preference.id ? null : preference.id)
                              }
                              onToggleActiveStatus={(nextIsActive) =>
                                handleTogglePreferenceStatus(preference.id, nextIsActive)
                              }
                              onViewAlerts={() => handleViewAlerts(preference)}
                            />
                          </div>
                        ))
                      ) : (
                        <p className="text-botanical-subtext">No inactive preferences.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertsModal
        isOpen={alertsOpen}
        onClose={handleCloseAlerts}
        alerts={alerts}
        loading={alertsLoading}
        error={alertsError}
        preference={selectedPreference}
      />

      <Footer />
    </div>
  );
}

export default Dashboard;
