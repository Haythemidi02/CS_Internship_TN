import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, Heart, FileText, MapPin, Star, TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '../api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInternships: 0,
    totalApplications: 0,
    totalFavorites: 0,
    byLocation: [],
    bySpecialty: [],
    byPriority: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/internships').then(res => res.json()),
      apiFetch('/api/applications').then(res => res.json()),
      apiFetch('/api/favorites').then(res => res.json())
    ])
      .then(([internshipsRes, applicationsRes, favoritesRes]) => {
        const internships = internshipsRes.data || [];
        const applications = applicationsRes.data || [];
        const favorites = favoritesRes.data || [];

        // Calculate stats
        const locationCount = {};
        const specialtyCount = {};
        const priorityCount = {};

        internships.forEach(item => {
          // Location
          const location = item.address || 'Unknown';
          locationCount[location] = (locationCount[location] || 0) + 1;

          // Specialties
          if (item.specialties) {
            const specs = item.specialties.split(/[,/&-]/).map(s => s.trim()).filter(s => s);
            specs.forEach(spec => {
              specialtyCount[spec] = (specialtyCount[spec] || 0) + 1;
            });
          }

          // Priority
          if (item.priority) {
            priorityCount[item.priority] = (priorityCount[item.priority] || 0) + 1;
          }
        });

        setStats({
          totalInternships: internships.length,
          totalApplications: applications.length,
          totalFavorites: favorites.length,
          byLocation: Object.entries(locationCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
          bySpecialty: Object.entries(specialtyCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
          byPriority: Object.entries(priorityCount).sort((a, b) => b[1] - a[1])
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching stats:', err);
        setLoading(false);
      });
  }, []);

  const quickActions = [
    { label: 'Find Internships', icon: Search, path: '/', color: 'primary' },
    { label: 'View Favorites', icon: Heart, path: '/favorites', color: 'warning' },
    { label: 'My Applications', icon: FileText, path: '/applications', color: 'success' }
  ];

  if (loading) {
    return <div className="loader"></div>;
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard</h1>
          <p>Welcome to ENSI Internship Portal - Your gateway to summer internships.</p>
        </div>
      </div>

      <div className="dashboard-container">
        {/* Overview Stats */}
        <section className="dashboard-section">
          <h2 className="section-title">
            <TrendingUp size={20} />
            Overview
          </h2>
          <div className="stats-grid">
            <motion.div
              className="stats-card glass"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="stats-icon" style={{ color: 'var(--primary-color)' }}>
                <Briefcase size={24} />
              </div>
              <div className="stats-content">
                <span className="stats-title">Total Internships</span>
                <span className="stats-value">{stats.totalInternships}</span>
              </div>
            </motion.div>

            <motion.div
              className="stats-card glass"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="stats-icon" style={{ color: 'var(--success-color)' }}>
                <FileText size={24} />
              </div>
              <div className="stats-content">
                <span className="stats-title">Applications</span>
                <span className="stats-value">{stats.totalApplications}</span>
              </div>
            </motion.div>

            <motion.div
              className="stats-card glass"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="stats-icon" style={{ color: 'var(--accent-color)' }}>
                <Heart size={24} />
              </div>
              <div className="stats-content">
                <span className="stats-title">Favorites</span>
                <span className="stats-value">{stats.totalFavorites}</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.path}
                className={`quick-action-card glass`}
                onClick={() => navigate(action.path)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <action.icon size={28} style={{ color: `var(--${action.color}-color)` }} />
                <span>{action.label}</span>
                <ArrowRight size={18} className="arrow-icon" />
              </motion.button>
            ))}
          </div>
        </section>

        {/* Stats Breakdown */}
        <div className="dashboard-grid">
          {/* By Location */}
          <section className="dashboard-section">
            <h2 className="section-title">
              <MapPin size={20} />
              By Location
            </h2>
            <div className="breakdown-list glass">
              {stats.byLocation.length > 0 ? (
                stats.byLocation.map(([location, count]) => (
                  <div key={location} className="breakdown-item">
                    <span className="breakdown-label">{location}</span>
                    <span className="breakdown-value">{count}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">No location data available</p>
              )}
            </div>
          </section>

          {/* By Specialty */}
          <section className="dashboard-section">
            <h2 className="section-title">
              <Star size={20} />
              By Specialty
            </h2>
            <div className="breakdown-list glass">
              {stats.bySpecialty.length > 0 ? (
                stats.bySpecialty.map(([specialty, count]) => (
                  <div key={specialty} className="breakdown-item">
                    <span className="breakdown-label">{specialty}</span>
                    <span className="breakdown-value">{count}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">No specialty data available</p>
              )}
            </div>
          </section>

          {/* By Priority */}
          <section className="dashboard-section">
            <h2 className="section-title">
              <Star size={20} />
              By Priority
            </h2>
            <div className="breakdown-list glass">
              {stats.byPriority.length > 0 ? (
                stats.byPriority.map(([priority, count]) => (
                  <div key={priority} className="breakdown-item">
                    <span className="breakdown-label priority-badge" data-priority={priority.toLowerCase()}>{priority}</span>
                    <span className="breakdown-value">{count}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">No priority data available</p>
              )}
            </div>
          </section>
        </div>

        {/* Help Section */}
        <section className="dashboard-section help-section">
          <h2 className="section-title">How to Search</h2>
          <div className="help-card glass">
            <ul className="help-list">
              <li>
                <strong>Search</strong> - Type in the search box to find internships by company name, subject, specialty, or location
              </li>
              <li>
                <strong>Filter</strong> - Use the filter panel on the left to narrow down results by location, specialty, or priority
              </li>
              <li>
                <strong>Sort</strong> - Sort results by score, company name, or date
              </li>
              <li>
                <strong>Favorite</strong> - Click the heart icon on any internship to save it to your favorites
              </li>
              <li>
                <strong>Apply</strong> - Click on an internship card to view details and apply with your CV and motivation letter
              </li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

export default Dashboard;
