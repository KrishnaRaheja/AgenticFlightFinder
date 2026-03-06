import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

function CreatePreference() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fadeIn, setFadeIn] = useState(false);
  
  // Fade-in animation on mount
  useEffect(() => {
    setFadeIn(true);
  }, []);
  
  const [formData, setFormData] = useState({
    // Required fields
    origin: '',
    destination: '',
    departure_period: '',
    return_period: '',
    
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
        departure_period: formData.departure_period,
        return_period: formData.return_period || null,
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

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .fade-in-page {
          animation: fadeIn 0.6s ease-out;
        }

        .fade-in-card {
          animation: fadeIn 0.5s ease-out;
        }

        .fade-in-section {
          animation: slideIn 0.4s ease-out;
        }

        .input-smooth {
          transition: all 0.2s ease-out;
        }

        .input-smooth:focus {
          transform: scale(1.02);
        }

        .smooth-button {
          transition: all 0.2s ease-out;
        }

        .smooth-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .smooth-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(73, 87, 85, 0.3);
          border-top-color: #495755;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }

        .error-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      <Navbar />

      <div className={`container mx-auto p-8 ${fadeIn ? 'fade-in-page' : ''}`}>
        <div className={`bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto ${fadeIn ? 'fade-in-card' : ''}`}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-botanical-subtext">Create Flight Preference</h2>
            <p className="text-botanical-subtext mt-2">
              Set up your flight monitoring preferences. Claude will search for deals and alert you when prices drop.
            </p>
          </div>

          {error && (
            <div className="bg-botanical-error border border-botanical-error-text rounded-lg p-4 mb-6 error-slide-in">
              <p className="text-botanical-error-text">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Section 1: Required Fields */}
            <div className="mb-8 fade-in-section" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-lg font-semibold text-botanical-subtext mb-4 pb-2 border-b border-botanical-accent">
                Required Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">
                    Origin <span className="text-botanical-error-text">*</span>
                  </label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    placeholder="e.g., JFK"
                    maxLength="3"
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                    required
                  />
                  <p className="text-xs text-botanical-subtext mt-1">3-letter airport code</p>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">
                    Destination <span className="text-botanical-error-text">*</span>
                  </label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    placeholder="e.g., LAX"
                    maxLength="3"
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                    required
                  />
                  <p className="text-xs text-botanical-subtext mt-1">3-letter airport code</p>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">
                    Departure <span className="text-botanical-error-text">*</span>
                  </label>
                  <input
                    type="text"
                    name="departure_period"
                    value={formData.departure_period}
                    onChange={handleChange}
                    placeholder="e.g., 2026-06-15 or June 2026"
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                    required
                  />
                  <p className="text-xs text-botanical-subtext mt-1">Exact date or a travel window (month, season, or date range)</p>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">
                    Return
                  </label>
                  <input
                    type="text"
                    name="return_period"
                    value={formData.return_period}
                    onChange={handleChange}
                    placeholder="e.g., 2026-06-22 or 1-2 weeks later"
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                  />
                  <p className="text-xs text-botanical-subtext mt-1">Optional: Exact date or a return window (month, season, or date range)</p>
                </div>
              </div>
            </div>

            {/* Section 2: Optional Filters */}
            <div className="mb-8 fade-in-section" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-lg font-semibold text-botanical-subtext mb-4 pb-2 border-b border-botanical-accent">
                Flight Preferences <span className="text-sm font-normal text-botanical-subtext">(Optional)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">Budget (USD)</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    min="0"
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                  />
                  <p className="text-xs text-botanical-subtext mt-1">Maximum price you're willing to pay</p>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">Max Stops</label>
                  <select
                    name="max_stops"
                    value={formData.max_stops}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                  >
                    <option value="0">Nonstop only</option>
                    <option value="1">Up to 1 stop</option>
                    <option value="2">Up to 2 stops</option>
                    <option value="3">Up to 3 stops</option>
                  </select>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">Cabin Class</label>
                  <select
                    name="cabin_class"
                    value={formData.cabin_class}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                  >
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First Class</option>
                  </select>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">Date Flexibility</label>
                  <select
                    name="date_flexibility"
                    value={formData.date_flexibility}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                  >
                    <option value="exact">Exact dates</option>
                    <option value="plus_minus_2">±2 days</option>
                    <option value="plus_minus_5">±5 days</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                  >
                    <option value="price">Lowest price</option>
                    <option value="balanced">Balanced</option>
                    <option value="convenience">Convenience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-botanical-subtext mb-2 font-medium">Alert Frequency</label>
                  <select
                    name="alert_frequency"
                    value={formData.alert_frequency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="nearby_airports"
                    id="nearby_airports"
                    checked={formData.nearby_airports}
                    onChange={handleChange}
                    className="mr-2 w-4 h-4 text-botanical-accent rounded focus:ring-2 focus:ring-botanical-accent"
                  />
                  <label htmlFor="nearby_airports" className="text-botanical-subtext">
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
                    className="mr-2 w-4 h-4 text-botanical-accent rounded focus:ring-2 focus:ring-botanical-accent"
                  />
                  <label htmlFor="prefer_non_work_days" className="text-botanical-subtext">
                    Prefer weekends/holidays
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Additional Context (Featured) */}
            <div className="mb-8 fade-in-section" style={{ animationDelay: '0.3s' }}>
              <div className="bg-botanical-accent/10 rounded-lg p-6 border-2 border-botanical-accent">
                <div className="flex items-start mb-4">
                  <svg className="w-6 h-6 text-botanical-accent mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-botanical-subtext">
                      Additional Context <span className="text-sm font-normal text-botanical-subtext">(Recommended)</span>
                    </h3>
                    <p className="text-sm text-botanical-subtext mt-1">
                      Help Claude understand your travel needs better.
                    </p>
                  </div>
                </div>
                
                <textarea
                  name="additional_context"
                  value={formData.additional_context}
                  onChange={handleChange}
                  placeholder="Example: I'm planning a family vacation with two kids (ages 6 and 9). We prefer morning flights and need to arrive before 6 PM. We're flexible on exact dates but want to avoid school holidays."
                  rows="6"
                  maxLength="1000"
                  className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent resize-none input-smooth"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-botanical-subtext">
                    Mention preferences, constraints, or special requirements
                  </p>
                  <p className="text-xs text-botanical-subtext">
                    {formData.additional_context.length}/1000
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 fade-in-section" style={{ animationDelay: '0.4s' }}>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-botanical-accent text-botanical-subtext py-3 rounded hover:bg-[#9ab5b3] disabled:bg-botanical-card disabled:cursor-not-allowed font-medium cursor-pointer smooth-button flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Creating...
                  </>
                ) : (
                  'Create Preference'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={loading}
                className="flex-1 bg-botanical-error text-white py-3 rounded hover:bg-botanical-error-text font-medium cursor-pointer smooth-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CreatePreference;
