import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-botanical-bg flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold text-botanical-subtext mb-6">
          {isSignup ? 'Sign Up' : 'Login'}
        </h1>

        {error && (
          <div className="bg-botanical-error text-botanical-errorText p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-botanical-subtext mb-2 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-botanical-subtext mb-2 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-botanical-accent text-botanical-subtext py-2 rounded hover:bg-[#9ab5b3] cursor-pointer font-medium"
          >
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="mt-4 text-botanical-accent hover:text-botanical-subtext cursor-pointer"
        >
          {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}

export default Login;
