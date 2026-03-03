import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

function CreatePreference() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Required fields
    origin: '',
    destination: '',
    timeframe: '',
    
    // Optional fields with defaults
    budget: '',
    max_stops: 2,
    cabin_class: 'economy',
    nearby_airports: false,
    date_flexibility: 'exact',
    priority: 'balanced',
    prefer_non_work_days: false,
    alert_frequency: 'weekly',
    additional_context: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validate IATA codes
      if (formData.origin.length !== 3 || formData.destination.length !== 3) {
        throw new Error('Origin and destination must be 3-letter airport codes');
      }
      
      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }
      
      // Prepare payload (convert empty budget to null)
      const payload = {
        origin: formData.origin.toUpperCase(),
        destination: formData.destination.toUpperCase(),
        timeframe: formData.timeframe,
        max_stops: parseInt(formData.max_stops),
        cabin_class: formData.cabin_class,
        budget: formData.budget ? parseInt(formData.budget) : null,
        nearby_airports: formData.nearby_airports,
        date_flexibility: formData.date_flexibility,
        priority: formData.priority,
        prefer_non_work_days: formData.prefer_non_work_days,
        alert_frequency: formData.alert_frequency,
        additional_context: formData.additional_context || null,
      };
      
      // Submit to backend
      const response = await fetch('http://localhost:8000/api/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create preference');
      }
      
      // Success - navigate to dashboard
      navigate('/');
      
    } catch (err) {
      console.error('Create preference error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

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
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Create Flight Preference</h2>
            <p className="text-gray-600 mt-2">
              Set up your flight monitoring preferences. Claude will search for deals and alert you when prices drop.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Section 1: Required Fields */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                Required Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Origin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    placeholder="e.g., JFK"
                    maxLength="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">3-letter airport code</p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Destination <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    placeholder="e.g., LAX"
                    maxLength="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">3-letter airport code</p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Timeframe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="timeframe"
                    value={formData.timeframe}
                    onChange={handleChange}
                    placeholder="e.g., June 2026, Summer 2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Month/season or date range</p>
                </div>
              </div>
            </div>

            {/* Section 2: Optional Filters */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                Flight Preferences <span className="text-sm font-normal text-gray-500">(Optional)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Budget (USD)</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum price you're willing to pay</p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Max Stops</label>
                  <select
                    name="max_stops"
                    value={formData.max_stops}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">Nonstop only</option>
                    <option value="1">Up to 1 stop</option>
                    <option value="2">Up to 2 stops</option>
                    <option value="3">Up to 3 stops</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Cabin Class</label>
                  <select
                    name="cabin_class"
                    value={formData.cabin_class}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First Class</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Date Flexibility</label>
                  <select
                    name="date_flexibility"
                    value={formData.date_flexibility}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exact">Exact dates</option>
                    <option value="plus_minus_3">±3 days</option>
                    <option value="plus_minus_7">±7 days</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="price">Lowest price</option>
                    <option value="balanced">Balanced</option>
                    <option value="convenience">Convenience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Alert Frequency</label>
                  <select
                    name="alert_frequency"
                    value={formData.alert_frequency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="nearby_airports"
                    id="nearby_airports"
                    checked={formData.nearby_airports}
                    onChange={handleChange}
                    className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="nearby_airports" className="text-gray-700">
                    Include nearby airports
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="prefer_non_work_days"
                    id="prefer_non_work_days"
                    checked={formData.prefer_non_work_days}
                    onChange={handleChange}
                    className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="prefer_non_work_days" className="text-gray-700">
                    Prefer weekends/holidays
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Additional Context (Featured) */}
            <div className="mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                <div className="flex items-start mb-4">
                  <svg className="w-6 h-6 text-blue-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Additional Context <span className="text-sm font-normal text-gray-600">(Recommended)</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Help Claude understand your travel needs better.
                    </p>
                  </div>
                </div>
                
                <textarea
                  name="additional_context"
                  value={formData.additional_context}
                  onChange={handleChange}
                  placeholder="Example: I'm planning a family vacation with two kids (ages 6 and 9). We prefer morning flights and need to arrive before 6 PM. We're flexible on exact dates but want to avoid school holidays. Budget-conscious but willing to pay more for direct flights."
                  rows="6"
                  maxLength="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Mention preferences, constraints, or special requirements
                  </p>
                  <p className="text-xs text-gray-500">
                    {formData.additional_context.length}/1000
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Preference'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded hover:bg-gray-400 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreatePreference;
