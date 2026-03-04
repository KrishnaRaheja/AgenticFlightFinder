import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <nav className="bg-white shadow-lg p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-botanical-subtext">Flight Deal Finder</Link>
        <div className="flex items-center gap-4">
          <span className="text-botanical-subtext">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="bg-[var(--color-logout)] text-white px-4 py-2 rounded hover:opacity-90 transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
