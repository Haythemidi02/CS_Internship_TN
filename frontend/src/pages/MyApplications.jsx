import { useState, useEffect } from 'react';
import { Trash2, FileText, CheckCircle, Clock, XCircle, Filter, Search, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ApplicationStats } from '../components/StatsCard';

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const fetchApplications = () => {
    fetch('http://localhost:8000/api/applications')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setApplications(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching applications:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this application record?")) return;

    try {
      const response = await fetch(`http://localhost:8000/api/applications/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success("Application record removed.");
        fetchApplications();
      } else {
        toast.error("Failed to delete record.");
      }
    } catch {
      toast.error("Network error.");
    }
  };

  const handleUpdateStatus = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `status=${editStatus}&notes=${encodeURIComponent(editNotes)}`
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success("Application updated.");
        setEditingId(null);
        fetchApplications();
      } else {
        toast.error("Failed to update.");
      }
    } catch {
      toast.error("Network error.");
    }
  };

  const startEdit = (app) => {
    setEditingId(app.id);
    setEditStatus(app.status);
    setEditNotes(app.notes || '');
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Accepted': return <span className="status-badge status-accepted"><CheckCircle size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> Accepted</span>;
      case 'Rejected': return <span className="status-badge status-rejected"><XCircle size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> Rejected</span>;
      default: return <span className="status-badge status-sent"><Clock size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> Sent</span>
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch = !searchTerm ||
      app.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h1>My Applications</h1>
          <p>Track the status of the internships you've applied to.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-section">
        <ApplicationStats applications={applications} />
      </div>

      <div className="table-container">
        {/* Filter Bar */}
        <div className="filter-bar glass">
          <div className="search-wrapper" style={{ flex: 1, maxWidth: '300px' }}>
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="status-filter">
            <Filter size={16} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="Sent">Sent</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <span className="results-count">
            {filteredApps.length} of {applications.length}
          </span>
        </div>

        {loading ? (
          <div className="loader"></div>
        ) : applications.length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h2>No Applications Yet</h2>
            <p>You haven't applied to any internships. Go to Find Internships to start!</p>
          </div>
        ) : (
          <div className="glass" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Date Applied</th>
                  <th>CV Attached</th>
                  <th>Motivation Attached</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.company_name}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(app.date_applied).toLocaleDateString()}</td>
                    <td>{app.cv_filename ? <span style={{ color: 'var(--success-color)' }}>Yes</span> : <span style={{ color: 'var(--text-secondary)' }}>No</span>}</td>
                    <td>{app.motivation_filename ? <span style={{ color: 'var(--success-color)' }}>Yes</span> : <span style={{ color: 'var(--text-secondary)' }}>No</span>}</td>
                    <td>
                      {editingId === app.id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="filter-select"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <option value="Sent">Sent</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      ) : (
                        getStatusBadge(app.status)
                      )}
                    </td>
                    <td>
                      {editingId === app.id ? (
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Add notes..."
                          className="filter-input"
                          style={{ width: '150px', padding: '0.25rem 0.5rem' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {app.notes || '-'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {editingId === app.id ? (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => handleUpdateStatus(app.id)}
                              title="Save"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => setEditingId(null)}
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-icon"
                              onClick={() => startEdit(app)}
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => handleDelete(app.id)}
                              title="Remove record"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default MyApplications;
