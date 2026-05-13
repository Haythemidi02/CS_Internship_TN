import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, Mail, Star, X, UploadCloud, Send } from 'lucide-react';
import toast from 'react-hot-toast';

function FindInternships() {
  const [internships, setInternships] = useState([]);
  const [filteredInternships, setFilteredInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [availableSpecialties, setAvailableSpecialties] = useState([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  
  // Modals
  const [selectedInternship, setSelectedInternship] = useState(null);
  
  // Application Form
  const [cvFile, setCvFile] = useState(null);
  const [motFile, setMotFile] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8000/api/internships')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setInternships(data.data);
          setFilteredInternships(data.data);
          
          // Extract unique specialties for the filter sidebar
          const specs = new Set();
          data.data.forEach(item => {
            if (item.specialties && typeof item.specialties === 'string') {
              item.specialties.split(/[,/&-]/).forEach(s => {
                const spec = s.trim();
                if (spec.length > 2) specs.add(spec);
              });
            }
          });
          setAvailableSpecialties(Array.from(specs).sort());
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = internships;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.company_name && String(item.company_name).toLowerCase().includes(term)) ||
        (item.subject && String(item.subject).toLowerCase().includes(term))
      );
    }

    if (selectedSpecialties.length > 0) {
      result = result.filter(item => {
        if (!item.specialties) return false;
        const itemSpecs = item.specialties.toLowerCase();
        return selectedSpecialties.some(s => itemSpecs.includes(s.toLowerCase()));
      });
    }

    setFilteredInternships(result);
  }, [searchTerm, selectedSpecialties, internships]);

  const toggleSpecialty = (spec) => {
    setSelectedSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
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

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h1>Find Internships</h1>
          <p>Explore opportunities and apply directly to your dream companies.</p>
        </div>
      </div>

      <div className="internships-container">
        {/* Sidebar Filters */}
        <aside className="filters-panel glass">
          <div className="filter-group">
            <h3><Search size={18} /> Search</h3>
            <div className="search-wrapper">
              <Search size={16} />
              <input 
                type="text" 
                className="search-input"
                placeholder="Keywords..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="filter-group">
            <h3><Star size={18} /> Specialties</h3>
            <div className="checkbox-list">
              {availableSpecialties.map(spec => (
                <label key={spec} className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={selectedSpecialties.includes(spec)}
                    onChange={() => toggleSpecialty(spec)}
                  />
                  <span>{spec}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Grid */}
        <div className="internships-content">
          {loading ? (
            <div className="loader"></div>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Showing <strong style={{ color: 'var(--primary-color)' }}>{filteredInternships.length}</strong> opportunities
              </p>
              
              <div className="internships-grid">
                {filteredInternships.map((internship, index) => (
                  <div className="card glass" key={internship.id || index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 className="company-name">{internship.company_name}</h3>
                      {internship.score && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-color)' }}>
                          <Star size={14} fill="currentColor" />
                          <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{internship.score}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="subject">{internship.subject || internship.tailored_angle || 'No details provided.'}</p>
                    
                    <div className="specialties">
                      {parseSpecialties(internship.specialties).slice(0, 3).map((spec, i) => (
                        <span key={i} className="specialty-tag">{spec}</span>
                      ))}
                    </div>

                    <div className="card-actions">
                      <button className="btn btn-primary" onClick={() => setSelectedInternship(internship)} style={{ flex: 1 }}>
                        View & Apply
                      </button>
                      {internship.email && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => openMailTo(internship.email, internship.company_name)}
                          title="Direct Email"
                        >
                          <Mail size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Application Modal */}
      {selectedInternship && (
        <div className="modal-overlay" onClick={() => setSelectedInternship(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
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
                <div className="form-group">
                  <label>Curriculum Vitae (PDF)</label>
                  <label className="file-upload-box">
                    <UploadCloud size={32} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                    <p style={{ color: '#fff', fontWeight: '500' }}>{cvFile ? cvFile.name : 'Click to Upload CV'}</p>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files[0])} required />
                  </label>
                </div>
                
                <div className="form-group">
                  <label>Motivation Letter (PDF)</label>
                  <label className="file-upload-box">
                    <UploadCloud size={32} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                    <p style={{ color: '#fff', fontWeight: '500' }}>{motFile ? motFile.name : 'Click to Upload Letter'}</p>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setMotFile(e.target.files[0])} />
                  </label>
                </div>
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
          </div>
        </div>
      )}
    </>
  );
}

export default FindInternships;
