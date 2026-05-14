import React, { useState, useEffect } from 'react';
import { Heart, Trash2, Mail, Search, MapPin, Star, Send, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import FileUploader from '../components/FileUploader';
import BulkEmailModal from '../components/BulkEmailModal';

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [applyModal, setApplyModal] = useState(null);

  // Application Form
  const [cvFile, setCvFile] = useState(null);
  const [motFile, setMotFile] = useState(null);
  const [applying, setApplying] = useState(false);

  const fetchFavorites = () => {
    fetch('http://localhost:8000/api/favorites')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setFavorites(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching favorites:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const removeFavorite = async (internshipId) => {
    if (!window.confirm('Remove this company from favorites?')) return;

    try {
      await fetch(`http://localhost:8000/api/favorites/${internshipId}`, { method: 'DELETE' });
      toast.success('Removed from favorites');
      fetchFavorites();
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const toggleSelection = (company) => {
    setSelectedCompanies(prev => {
      if (prev.some(c => c.internship_id === company.internship_id)) {
        return prev.filter(c => c.internship_id !== company.internship_id);
      }
      return [...prev, company];
    });
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);

    const formData = new FormData();
    formData.append('internship_id', applyModal.internship_id || 'N/A');
    formData.append('company_name', applyModal.company_name);
    if (cvFile) formData.append('cv', cvFile);
    if (motFile) formData.append('motivation', motFile);

    try {
      const response = await fetch('http://localhost:8000/api/applications', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.status === 'success') {
        toast.success(`Application sent to ${applyModal.company_name}!`);
        setApplyModal(null);
        setCvFile(null);
        setMotFile(null);
      } else {
        toast.error("Failed to send application.");
      }
    } catch (err) {
      toast.error("Network error while applying.");
    } finally {
      setApplying(false);
    }
  };

  const openMailTo = (email, company) => {
    const subject = encodeURIComponent(`Application for Summer Internship - ${company}`);
    const body = encodeURIComponent(`Hello HR Team at ${company},\n\nI am a computer science student at ENSI writing to apply for the summer internship position.\n\nPlease find my CV attached.\n\nBest regards,\n[Your Name]`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const filteredFavorites = favorites.filter(f =>
    f.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h1>My Favorites</h1>
          <p>Companies you've saved for later.</p>
        </div>
      </div>

      <div className="favorites-container">
        <div className="favorites-toolbar">
          <div className="search-wrapper" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search favorites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {selectedCompanies.length > 0 && (
            <motion.div
              className="selection-actions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="selected-count">
                {selectedCompanies.length} selected
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setShowBulkEmail(true)}
              >
                <Mail size={18} /> Email Selected
              </button>
            </motion.div>
          )}
        </div>

        {loading ? (
          <div className="loader"></div>
        ) : filteredFavorites.length === 0 ? (
          <div className="glass empty-state">
            <Heart size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h2>No Favorites Yet</h2>
            <p>Start exploring internships and add companies to your favorites!</p>
          </div>
        ) : (
          <div className="favorites-grid">
            <AnimatePresence>
              {filteredFavorites.map((fav) => (
                <motion.div
                  key={fav.id}
                  className="card glass favorite-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="favorite-header">
                    <input
                      type="checkbox"
                      checked={selectedCompanies.some(c => c.internship_id === fav.internship_id)}
                      onChange={() => toggleSelection(fav)}
                    />
                    <h3 className="company-name">{fav.company_name}</h3>
                    <button
                      className="btn-remove-fav"
                      onClick={() => removeFavorite(fav.internship_id)}
                      title="Remove from favorites"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {fav.email && (
                    <div className="favorite-email">
                      <Mail size={14} />
                      <span>{fav.email}</span>
                    </div>
                  )}

                  {fav.specialties && (
                    <div className="specialties">
                      {fav.specialties.split(/[,/&-]/).slice(0, 3).map((spec, i) => (
                        <span key={i} className="specialty-tag">{spec.trim()}</span>
                      ))}
                    </div>
                  )}

                  <div className="favorite-actions">
                    <button className="btn btn-primary" onClick={() => setApplyModal(fav)} style={{ flex: 1 }}>
                      <Send size={16} /> Apply
                    </button>
                    {fav.email && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => openMailTo(fav.email, fav.company_name)}
                      >
                        <Mail size={16} />
                      </button>
                    )}
                  </div>

                  <div className="favorite-date">
                    Added {new Date(fav.date_added).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Application Modal */}
      <AnimatePresence>
        {applyModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setApplyModal(null)}
          >
            <motion.div
              className="modal-content glass"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="btn-icon" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none' }} onClick={() => setApplyModal(null)}>
                <Trash2 size={24} />
              </button>

              <h2 className="company-name" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{applyModal.company_name}</h2>

              <form onSubmit={handleApply} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1.5rem' }}>Submit Application</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <FileUploader
                    label="Curriculum Vitae (PDF)"
                    file={cvFile}
                    setFile={setCvFile}
                    accept=".pdf,.doc,.docx"
                    required
                  />

                  <FileUploader
                    label="Motivation Letter (PDF)"
                    file={motFile}
                    setFile={setMotFile}
                    accept=".pdf,.doc,.docx"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  {applyModal.email && (
                    <button type="button" className="btn btn-secondary" onClick={() => openMailTo(applyModal.email, applyModal.company_name)}>
                      <Mail size={18} /> Send direct Email instead
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={applying}>
                    {applying ? 'Sending...' : <><Send size={18} /> Apply Now</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Email Modal */}
      <AnimatePresence>
        {showBulkEmail && (
          <BulkEmailModal
            selectedCompanies={selectedCompanies}
            onClose={() => setShowBulkEmail(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default Favorites;