import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Terminal, LayoutDashboard, Search, FolderKanban, Heart, LogOut, User } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import FindInternships from './pages/FindInternships';
import MyApplications from './pages/MyApplications';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Wrapper that redirects unauthenticated users to /login
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader" style={{ margin: '20vh auto' }} />;
  return user ? children : <Navigate to="/login" replace />;
}

function AppShell() {
  const { user, logout } = useAuth();
  return (
    <div className="app-container">
      <Toaster position="top-right" toastOptions={{
        style: { background: 'rgba(31,40,51,0.95)', color: '#fff', backdropFilter: 'blur(10px)', border: '1px solid rgba(69,162,158,0.3)' }
      }} />

      <nav className="sidebar">
        <div className="sidebar-header">
          <Terminal className="logo-icon" size={32} />
          <div className="logo-text">ENSI Portal</div>
        </div>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/internships" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Search size={20} /> Find Internships
          </NavLink>
          <NavLink to="/favorites" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Heart size={20} /> Favorites
          </NavLink>
          <NavLink to="/applications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FolderKanban size={20} /> My Applications
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <User size={16} />
            <span className="sidebar-user-name">{user?.full_name}</span>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="main-wrapper">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/internships" element={<FindInternships />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/applications" element={<MyApplications />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader" style={{ margin: '40vh auto' }} />;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
