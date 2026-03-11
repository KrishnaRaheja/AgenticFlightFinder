import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/Footer';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  // Fade-in animation on mount
  useEffect(() => {
    setFadeIn(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      const errorMessage = err.message === 'Email not confirmed'
        ? 'Email not confirmed, check your inbox to verify email'
        : (err.message || 'Authentication failed');
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-botanical-card via-botanical-bg to-[#6b8d89] flex flex-col items-center justify-center pb-24 px-4"
      style={{
        animation: fadeIn ? 'fadeIn 0.8s ease-in-out both' : 'none'
      }}
    >
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

        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }

        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid rgba(233, 213, 201, 0.3);
          border-top-color: #e9d5c9;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .card-hover:hover {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          transform: translateY(-2px);
        }

        .input-focus:focus {
          border-color: #abc6c4;
          box-shadow: 0 0 0 3px rgba(171, 198, 196, 0.1);
          outline: none;
        }

        .button-ripple:active {
          transform: scale(0.98);
        }

        .fade-in-error {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      {/* Three Column Layout: left | center (title + card) | right */}
      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-center gap-8 md:gap-12 my-8 px-8">

        {/* LEFT COLUMN: "THE WORLD'S FIRST" */}
        <div
          className="order-2 md:order-1 md:flex-1 text-center md:text-right"
          style={{ animation: fadeIn ? 'fadeIn 0.8s ease-in-out 0.3s both' : 'none' }}
        >
          <p className="text-5xl md:text-6xl lg:text-7xl font-black uppercase leading-none tracking-tight text-[#abc6c4] opacity-80">
            THE<br />WORLD'S<br />FIRST
          </p>
        </div>

        {/* MIDDLE COLUMN: Title + Subtitle + Login Card */}
        <div className="order-1 md:order-2 flex-none flex flex-col items-center">

          {/* Title */}
          <div
            className="text-center mb-8"
            style={{ animation: fadeIn ? 'fadeIn 0.8s ease-in-out 0.2s both' : 'none' }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-botanical-text mb-4 leading-tight">
              Agentic Flight Finder
            </h1>
            <p className="text-xl md:text-2xl text-[#abc6c4] font-black tracking-wide uppercase">
              Search once, never again.
            </p>
          </div>

          {/* Login Card */}
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 border border-[#abc6c4] border-opacity-30 card-hover transition-all duration-300"
            style={{ animation: fadeIn ? 'fadeIn 0.8s ease-in-out 0.4s both' : 'none' }}
          >
            <h2 className="text-3xl font-bold text-botanical-subtext mb-8 text-center">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>

            {/* Error Message */}
            {error && (
              <div className="bg-botanical-error text-white p-4 rounded-lg mb-6 fade-in-error border border-[#f59a71] border-opacity-50">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="mb-6">
                <label className="block text-botanical-subtext mb-3 font-semibold text-sm">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border-2 border-[#abc6c4] border-opacity-40 rounded-lg input-focus bg-white text-botanical-subtext placeholder-[#72908d] placeholder-opacity-50 transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="mb-8">
                <label className="block text-botanical-subtext mb-3 font-semibold text-sm">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="your password"
                  className="w-full px-4 py-3 border-2 border-[#abc6c4] border-opacity-40 rounded-lg input-focus bg-white text-botanical-subtext placeholder-[#72908d] placeholder-opacity-50 transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-botanical-accent text-botanical-subtext py-3 rounded-lg font-semibold text-base hover:bg-[#9ab5b3] active:bg-[#8aa3a1] transition-all duration-200 button-ripple disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    {isSignup ? 'Creating Account...' : 'Logging In...'}
                  </>
                ) : (
                  isSignup ? 'Create Account' : 'Login'
                )}
              </button>
            </form>

            {/* Toggle Button */}
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              disabled={isLoading}
              className="mt-6 text-center w-full text-botanical-card hover:text-botanical-subtext transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSignup ? (
                <span>Already have an account? <span className="text-botanical-accent">Login</span></span>
              ) : (
                <span>Don't have an account? <span className="text-botanical-accent">Sign Up</span></span>
              )}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Editorial description */}
        <div
          className="order-3 md:order-3 md:flex-1 text-center md:text-left mt-8 md:mt-14"
          style={{ animation: fadeIn ? 'fadeIn 0.8s ease-in-out 0.4s both' : 'none' }}
        >
          <div className="text-lg md:text-xl text-[#abc6c4] font-semibold leading-relaxed opacity-90 space-y-3">
            <p>
              <span className="text-white font-black tracking-wide uppercase text-xl md:text-2xl">AI-powered:</span>
              <br />
              <span className="text-base md:text-lg text-[#abc6c4] font-medium tracking-normal normal-case">Agent understands context, not just price drops</span>
            </p>
            <p>
              <span className="text-white font-black tracking-wide uppercase text-xl md:text-2xl">Talk to it!</span>
              <br />
              <span className="text-base md:text-lg text-[#abc6c4] font-medium tracking-normal normal-case">Intelligent searching based on Natural Language</span>
            </p>
            <p>
              <span className="text-white font-black tracking-wide uppercase text-xl md:text-2xl">Set it and forget it:</span>
              <br />
              <span className="text-base md:text-lg text-[#abc6c4] font-medium tracking-normal normal-case">Set preferences once, agent handles the rest</span>
            </p>
          </div>
        </div>

      </div>

      {/* Footer - Positioned at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-botanical-card to-transparent pt-8">
        <Footer />
      </div>
    </div>
  );
}

export default Login;
