import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Terminal, Search, FolderKanban, User } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import FindInternships from './pages/FindInternships';
import MyApplications from './pages/MyApplications';

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
            <Search size={20} />
            Find Internships
          </NavLink>
          <NavLink to="/applications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FolderKanban size={20} />
            My Applications
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={20} />
            Profile
          </NavLink>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-wrapper">
        <Routes>
          <Route path="/" element={<FindInternships />} />
          <Route path="/applications" element={<MyApplications />} />
          <Route path="/profile" element={<div className="page-header"><div className="page-title"><h1>Profile Settings</h1><p>Update your resume and preferences.</p></div></div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
