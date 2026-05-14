import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Briefcase, Mail, Star, X, UploadCloud, Send, Heart, CheckSquare, Square, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import FilterPanel from '../components/FilterPanel';
import InternshipCard from '../components/InternshipCard';
import FileUploader from '../components/FileUploader';
import BulkEmailModal from '../components/BulkEmailModal';

function FindInternships() {
  const [internships, setInternships] = useState([]);
  const [filteredInternships, setFilteredInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ locations: [], specialties: [], priorities: [] });

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    locations: [],
    specialties: [],
    priorities: []
  });
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selection & Favorites
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [showBulkEmail, setShowBulkEmail] = useState(false);

  // Modals
  const [selectedInternship, setSelectedInternship] = useState(null);

  // Application Form
  const [cvFile, setCvFile] = useState(null);
  const [motFile, setMotFile] = useState(null);
  const [applying, setApplying] = useState(false);

  // Fetch internships with filters
  const fetchInternships = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedFilters.locations?.length) params.append('location', selectedFilters.locations[0]);
    if (selectedFilters.priorities?.length) params.append('priority', selectedFilters.priorities[0]);
    if (selectedFilters.specialties?.length) params.append('specialty', selectedFilters.specialties[0]);
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);

    fetch(`http://localhost:8000/api/internships?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setInternships(data.data);
          setFilteredInternships(data.data);
          if (data.filters) setFilters(data.filters);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, [searchTerm, selectedFilters, sortBy, sortOrder]);

  const fetchFavorites = useCallback(() => {
    fetch('http://localhost:8000/api/favorites')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setFavorites(new Set(data.data.map(f => f.internship_id)));
        }
      })
      .catch(err => console.error('Error fetching favorites:', err));
  }, []);

  useEffect(() => {
    fetchInternships();
    fetchFavorites();
  }, [fetchInternships, fetchFavorites]);

  // Client-side filtering for multiple selections
  useEffect(() => {
    let result = internships;

    if (selectedFilters.locations?.length > 0) {
      result = result.filter(item =>
        selectedFilters.locations.some(loc =>
          String(item.address || '').toLowerCase().includes(loc.toLowerCase())
        )
      );
    }

    if (selectedFilters.specialties?.length > 0) {
      result = result.filter(item =>
        selectedFilters.specialties.some(spec =>
          String(item.specialties || '').toLowerCase().includes(spec.toLowerCase())
        )
      );
    }

    if (selectedFilters.priorities?.length > 0) {
      result = result.filter(item =>
        selectedFilters.priorities.includes(item.priority)
      );
    }

    setFilteredInternships(result);
  }, [selectedFilters, internships]);

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredInternships.map(i => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedFilters({ locations: [], specialties: [], priorities: [] });
  };

  const toggleFavorite = async (internship) => {
    const isFav = favorites.has(internship.id);

    try {
      if (isFav) {
        await fetch(`http://localhost:8000/api/favorites/${internship.id}`, { method: 'DELETE' });
        toast.success('Removed from favorites');
      } else {
        await fetch('http://localhost:8000/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `internship_id=${internship.id}&company_name=${encodeURIComponent(internship.company_name)}&email=${encodeURIComponent(internship.email || '')}&specialties=${encodeURIComponent(internship.specialties || '')}`
        });
        toast.success('Added to favorites');
      }
      fetchFavorites();
    } catch (err) {
      toast.error('Failed to update favorites');
    }
  };

  const parseSpecialties = (specs) => {
    if (!specs || typeof specs !== 'string') return [];
    return specs.split(/[,/&-]/).map(s => s.trim()).filter(s => s.length > 0);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);

    const formData = new FormData();
    formData.append('internship_id', selectedInternship.id || 'N/A');
    formData.append('company_name', selectedInternship.company_name);
    if (cvFile) formData.append('cv', cvFile);
    if (motFile) formData.append('motivation', motFile);

    try {
      const response = await fetch('http://localhost:8000/api/applications', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.status === 'success') {
        toast.success(`Application sent to ${selectedInternship.company_name}!`);
        setSelectedInternship(null);
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
    const body = encodeURIComponent(`Hello HR Team at ${company},\n\nI am a computer science student at ENSI writing to apply for the summer internship position.\n\nPlease find my CV attached (Note: ensure files are attached before sending).\n\nBest regards,\n[Your Name]`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const getSelectedCompanies = () => {
    return filteredInternships.filter(i => selectedIds.has(i.id));
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h1>Find Internships</h1>
          <p>Explore opportunities and apply directly to your dream companies.</p>
        </div>
      </div>

      <div className="internships-container">
        <FilterPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filters={filters}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          totalResults={filteredInternships.length}
          onClearFilters={clearFilters}
        />

        <div className="internships-content">
          {/* Selection Bar */}
          <AnimatePresence>
            {filteredInternships.length > 0 && (
              <motion.div
                className="selection-bar glass"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="selection-info">
                  <button className="btn-select-all" onClick={selectAll}>
                    <Square size={18} /> Select All
                  </button>
                  <button className="btn-select-all" onClick={deselectAll}>
                    <CheckSquare size={18} /> Deselect All
                  </button>
                  <span className="selected-count">
                    <Check size={16} /> {selectedIds.size} selected
                  </span>
                </div>
                <div className="selection-actions">
                  {selectedIds.size > 0 && (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowBulkEmail(true)}
                        disabled={!getSelectedCompanies().some(c => c.email)}
                      >
                        <Mail size={18} /> Email Selected
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          getSelectedCompanies().forEach(c => toggleFavorite(c));
                        }}
                      >
                        <Heart size={18} /> Add to Favorites
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="loader"></div>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Showing <strong style={{ color: 'var(--primary-color)' }}>{filteredInternships.length}</strong> opportunities
              </p>

              <div className="internships-grid">
                <AnimatePresence>
                  {filteredInternships.map((internship) => (
                    <InternshipCard
                      key={internship.id}
                      internship={internship}
                      isSelected={selectedIds.has(internship.id)}
                      isFavorite={favorites.has(internship.id)}
                      onSelect={toggleSelection}
                      onToggleFavorite={toggleFavorite}
                      onApply={setSelectedInternship}
                      onDirectEmail={openMailTo}
                      searchTerm={searchTerm}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Application Modal */}
      <AnimatePresence>
        {selectedInternship && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedInternship(null)}
          >
            <motion.div
              className="modal-content glass"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="btn-icon" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none' }} onClick={() => setSelectedInternship(null)}>
                <X size={24} />
              </button>

              <h2 className="company-name" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{selectedInternship.company_name}</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={18}/> Project</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{selectedInternship.subject || selectedInternship.tailored_angle || 'Not specified'}</p>
                </div>
                <div>
                  <h3 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={18}/> Details</h3>
                  <p style={{ color: 'var(--text-secondary)' }}><strong>Address:</strong> {selectedInternship.address || 'N/A'}</p>
                  <p style={{ color: 'var(--text-secondary)' }}><strong>Email:</strong> {selectedInternship.email || 'N/A'}</p>
                  <p style={{ color: 'var(--text-secondary)' }}><strong>Phone:</strong> {selectedInternship.phone || 'N/A'}</p>
                </div>
              </div>

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
                  {selectedInternship.email && (
                    <button type="button" className="btn btn-secondary" onClick={() => openMailTo(selectedInternship.email, selectedInternship.company_name)}>
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
            selectedCompanies={getSelectedCompanies()}
            onClose={() => setShowBulkEmail(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default FindInternships;