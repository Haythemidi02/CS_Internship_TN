import { Routes, Route, NavLink } from 'react-router-dom';
import { Terminal, LayoutDashboard, Search, FolderKanban, Heart } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import FindInternships from './pages/FindInternships';
import MyApplications from './pages/MyApplications';
import Favorites from './pages/Favorites';

function App() {
  return (
    <div className="app-container">
      <Toaster position="top-right" toastOptions={{
        style: { background: 'rgba(31, 40, 51, 0.9)', color: '#fff', backdropFilter: 'blur(10px)', border: '1px solid rgba(69, 162, 158, 0.3)' }
      }} />

      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <Terminal className="logo-icon" size={32} />
          <div className="logo-text">ENSI Portal</div>
        </div>

        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink to="/internships" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Search size={20} />
            Find Internships
          </NavLink>
          <NavLink to="/favorites" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Heart size={20} />
            Favorites
          </NavLink>
          <NavLink to="/applications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FolderKanban size={20} />
            My Applications
          </NavLink>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-wrapper">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/internships" element={<FindInternships />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/applications" element={<MyApplications />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
