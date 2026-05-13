import React, { useState, useEffect } from 'react';
import { Trash2, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      toast.error("Network error.");
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Accepted': return <span className="status-badge status-accepted"><CheckCircle size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> Accepted</span>;
      case 'Rejected': return <span className="status-badge status-rejected"><XCircle size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> Rejected</span>;
      default: return <span className="status-badge status-sent"><Clock size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> Sent</span>;
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h1>My Applications</h1>
          <p>Track the status of the internships you've applied to.</p>
        </div>
      </div>

      <div className="table-container">
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.company_name}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(app.date_applied).toLocaleDateString()}</td>
                    <td>{app.cv_filename ? <span style={{ color: 'var(--success-color)' }}>Yes</span> : <span style={{ color: 'var(--text-secondary)' }}>No</span>}</td>
                    <td>{app.motivation_filename ? <span style={{ color: 'var(--success-color)' }}>Yes</span> : <span style={{ color: 'var(--text-secondary)' }}>No</span>}</td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleDelete(app.id)}
                        title="Remove record"
                      >
                        <Trash2 size={18} />
                      </button>
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
