import { useState, useEffect, useRef } from 'react';
import {
  Search, Star, MapPin, SlidersHorizontal, X, ChevronDown, ChevronUp,
  Building, Globe, Briefcase, Sparkles, Upload, Loader2, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AdvancedFilterPanel({
  searchTerm,
  setSearchTerm,
  filters,
  selectedFilters,
  setSelectedFilters,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  totalResults,
  onClearFilters,
  userSkills,
  setUserSkills,
  extractingSkills,
  onExtractSkills,
  onSaveProfile,
  cvMatchScore
}) {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState({ companies: [], cities: [], skills: [] });
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    location: true,
    skills: true,
    company: true,
    sort: true
  });
  const [showCvUpload, setShowCvUpload] = useState(false);
  const searchTimeout = useRef(null);

  const { countries = [], cities = [], governorates = [], priorities = [], company_types = [] } = filters;

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchTerm(localSearch);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [localSearch, setSearchTerm]);

  // Fetch suggestions when typing
  useEffect(() => {
    if (localSearch.length < 2) {
      return;
    }

    let ignore = false;
    fetch(`http://localhost:8000/api/search-suggestions?q=${encodeURIComponent(localSearch)}`)
      .then(res => res.json())
      .then(data => {
        if (!ignore && data.status === 'success') {
          setSuggestions(data.data);
          setShowSuggestions(true);
        }
      })
      .catch(() => setShowSuggestions(false));

    return () => {
      ignore = true;
    };
  }, [localSearch]);

  const handleSearchChange = (e) => {
    const nextSearch = e.target.value;
    setLocalSearch(nextSearch);
    if (nextSearch.length < 2) {
      setShowSuggestions(false);
    }
  };

  const handleClearFilters = () => {
    setLocalSearch('');
    setShowSuggestions(false);
    onClearFilters();
  };

  const handleSuggestionClick = (text) => {
    setLocalSearch(text);
    setShowSuggestions(false);
  };

  const toggleFilter = (type, value) => {
    setSelectedFilters(prev => {
      const current = prev[type] || [];
      if (current.includes(value)) {
        return { ...prev, [type]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [type]: [...current, value] };
      }
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const activeFilterCount = Object.values(selectedFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  const addSkill = (skill) => {
    if (skill && !userSkills.includes(skill)) {
      setUserSkills([...userSkills, skill]);
    }
  };

  const removeSkill = (skill) => {
    setUserSkills(userSkills.filter(s => s !== skill));
  };

  return (
    <aside className="filters-panel glass">
      {/* Header */}
      <div className="filter-header">
        <div className="filter-title">
          <SlidersHorizontal size={20} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button className="btn-clear" onClick={handleClearFilters}>
            <X size={14} /> Clear all
          </button>
        )}
      </div>

      {/* CV-Based Matching Section */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('skills')}
        >
          <div className="filter-section-title">
            <Sparkles size={18} />
            <span>Smart Match</span>
            {userSkills.length > 0 && (
              <span className="skill-count">{userSkills.length}</span>
            )}
          </div>
          {expandedSections.skills ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {expandedSections.skills && (
            <motion.div
              className="filter-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <p className="filter-hint">Upload your CV or add skills to get personalized recommendations</p>

              {/* CV Upload */}
              <div className="cv-upload-section">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCvUpload(!showCvUpload)}
                >
                  <Upload size={14} /> {showCvUpload ? 'Hide' : 'Upload CV'}
                </button>

                <AnimatePresence>
                  {showCvUpload && (
                    <motion.div
                      className="cv-upload-box"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={onExtractSkills}
                        disabled={extractingSkills}
                      />
                      {extractingSkills && (
                        <div className="extracting-indicator">
                          <Loader2 size={16} className="spin" /> Extracting skills...
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Manual Skills Input */}
              <div className="skill-input-wrapper">
                <input
                  type="text"
                  placeholder="Add a skill (e.g., Python, React)"
                  className="skill-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      addSkill(e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Selected Skills */}
              {userSkills.length > 0 && (
                <div className="selected-skills">
                  {userSkills.map(skill => (
                    <span key={skill} className="skill-tag removable" onClick={() => removeSkill(skill)}>
                      {skill} <X size={12} />
                    </span>
                  ))}
                  <button className="btn-save-profile" onClick={onSaveProfile}>
                    <Save size={12} /> Save
                  </button>
                </div>
              )}

              {cvMatchScore && (
                <div className="cv-match-info">
                  <Sparkles size={14} /> Best match: {cvMatchScore}%
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Section */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('search')}
        >
          <div className="filter-section-title">
            <Search size={18} />
            <span>Search</span>
          </div>
          {expandedSections.search ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {expandedSections.search && (
            <motion.div
              className="filter-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="search-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search companies, subjects, skills..."
                  value={localSearch}
                  onChange={handleSearchChange}
                  onFocus={() => localSearch.length >= 2 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {localSearch && (
                  <button className="search-clear" onClick={() => setLocalSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Suggestions */}
              <AnimatePresence>
                {showSuggestions && (suggestions.companies.length > 0 || suggestions.cities.length > 0 || suggestions.skills.length > 0) && (
                  <motion.div
                    className="suggestions-dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {suggestions.companies.length > 0 && (
                      <div className="suggestion-group">
                        <span className="suggestion-label">Companies</span>
                        {suggestions.companies.map(c => (
                          <div key={c} className="suggestion-item" onClick={() => handleSuggestionClick(c)}>
                            <Building size={12} /> {c}
                          </div>
                        ))}
                      </div>
                    )}
                    {suggestions.cities.length > 0 && (
                      <div className="suggestion-group">
                        <span className="suggestion-label">Cities</span>
                        {suggestions.cities.map(c => (
                          <div key={c} className="suggestion-item" onClick={() => handleSuggestionClick(c)}>
                            <MapPin size={12} /> {c}
                          </div>
                        ))}
                      </div>
                    )}
                    {suggestions.skills.length > 0 && (
                      <div className="suggestion-group">
                        <span className="suggestion-label">Skills</span>
                        {suggestions.skills.map(s => (
                          <div key={s} className="suggestion-item" onClick={() => addSkill(s)}>
                            <Sparkles size={12} /> {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Location Section */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('location')}
        >
          <div className="filter-section-title">
            <Globe size={18} />
            <span>Location</span>
            {(selectedFilters.countries?.length > 0 || selectedFilters.cities?.length > 0 || selectedFilters.governorates?.length > 0) && (
              <span className="active-filter-count">
                {selectedFilters.countries?.length + selectedFilters.cities?.length + selectedFilters.governorates?.length}
              </span>
            )}
          </div>
          {expandedSections.location ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {expandedSections.location && (
            <motion.div
              className="filter-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              {/* Country Filter */}
              {countries.length > 0 && (
                <div className="filter-group">
                  <h4><Globe size={14} /> Country</h4>
                  <div className="checkbox-list scrollable">
                    {countries.slice(0, 10).map(c => (
                      <label key={c} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedFilters.countries?.includes(c) || false}
                          onChange={() => toggleFilter('countries', c)}
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Governorate Filter (Tunisia) */}
              {governorates.length > 0 && (
                <div className="filter-group">
                  <h4><MapPin size={14} /> Governorate</h4>
                  <div className="checkbox-list scrollable">
                    {governorates.slice(0, 10).map(g => (
                      <label key={g} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedFilters.governorates?.includes(g) || false}
                          onChange={() => toggleFilter('governorates', g)}
                        />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* City Filter */}
              {cities.length > 0 && (
                <div className="filter-group">
                  <h4><MapPin size={14} /> City</h4>
                  <div className="checkbox-list scrollable">
                    {cities.slice(0, 15).map(c => (
                      <label key={c} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedFilters.cities?.includes(c) || false}
                          onChange={() => toggleFilter('cities', c)}
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Company Type Section */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('company')}
        >
          <div className="filter-section-title">
            <Building size={18} />
            <span>Company Type</span>
            {selectedFilters.company_types?.length > 0 && (
              <span className="active-filter-count">{selectedFilters.company_types.length}</span>
            )}
          </div>
          {expandedSections.company ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {expandedSections.company && (
            <motion.div
              className="filter-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="filter-group">
                <div className="checkbox-list">
                  {company_types.map(ct => (
                    <label key={ct} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedFilters.company_types?.includes(ct) || false}
                        onChange={() => toggleFilter('company_types', ct)}
                      />
                      <span>{ct}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Priority Section */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('priority')}
        >
          <div className="filter-section-title">
            <Star size={18} />
            <span>Priority</span>
            {selectedFilters.priorities?.length > 0 && (
              <span className="active-filter-count">{selectedFilters.priorities.length}</span>
            )}
          </div>
          {expandedSections.priority ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {expandedSections.priority && (
            <motion.div
              className="filter-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="filter-group">
                <div className="checkbox-list">
                  {priorities.map(pri => (
                    <label key={pri} className="checkbox-item priority-checkbox" data-priority={pri.toLowerCase().charAt(0)}>
                      <input
                        type="checkbox"
                        checked={selectedFilters.priorities?.includes(pri) || false}
                        onChange={() => toggleFilter('priorities', pri)}
                      />
                      <span>{pri}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sort Section */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('sort')}
        >
          <div className="filter-section-title">
            <Briefcase size={18} />
            <span>Sort By</span>
          </div>
          {expandedSections.sort ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {expandedSections.sort && (
            <motion.div
              className="filter-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="sort-options">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="score">Best Score</option>
                  <option value="cv_match">CV Match</option>
                  <option value="name">Company Name</option>
                  <option value="city">City</option>
                </select>
                <button
                  className={`btn-sort ${sortOrder === 'desc' ? 'active' : ''}`}
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                >
                  {sortOrder === 'desc' ? 'Desc' : 'Asc'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <div className="results-count">
        <strong>{totalResults}</strong> results found
      </div>
    </aside>
  );
}

export default AdvancedFilterPanel;
