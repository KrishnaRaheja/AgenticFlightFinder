import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreatePreference from './pages/CreatePreference';

function App() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard - Protected Route */}
        <Route
          path="/"
          element={user ? <Dashboard /> : <Navigate to="/login" replace />}
        />

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Create Preference - Protected Route */}
        <Route
          path="/create"
          element={user ? <CreatePreference /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App