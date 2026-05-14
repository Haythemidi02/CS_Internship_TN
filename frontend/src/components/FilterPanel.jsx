import React from 'react';
import { Search, Star, MapPin, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function FilterPanel({
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
  onClearFilters
}) {
  const { locations = [], specialties = [], priorities = [] } = filters;

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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

  const activeFilterCount = Object.values(selectedFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <aside className="filters-panel glass">
      <div className="filter-header">
        <div className="filter-title">
          <SlidersHorizontal size={20} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button className="btn-clear" onClick={onClearFilters}>
            <X size={14} /> Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="filter-group">
        <div className="search-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search companies, subjects..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Sort */}
      <div className="filter-group">
        <h3>Sort By</h3>
        <div className="sort-options">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="score">Score</option>
            <option value="name">Company Name</option>
            <option value="date">Date</option>
          </select>
          <button
            className={`btn-sort ${sortOrder === 'desc' ? 'active' : ''}`}
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Location Filter */}
      {locations.length > 0 && (
        <div className="filter-group">
          <h3><MapPin size={16} /> Location</h3>
          <div className="checkbox-list scrollable">
            {locations.map(loc => (
              <label key={loc} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedFilters.locations?.includes(loc) || false}
                  onChange={() => toggleFilter('locations', loc)}
                />
                <span>{loc}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Priority Filter */}
      {priorities.length > 0 && (
        <div className="filter-group">
          <h3><Star size={16} /> Priority</h3>
          <div className="checkbox-list scrollable">
            {priorities.map(pri => (
              <label key={pri} className="checkbox-item">
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
      )}

      {/* Specialty Filter */}
      {specialties.length > 0 && (
        <div className="filter-group">
          <h3><Star size={16} /> Specialties</h3>
          <div className="checkbox-list scrollable">
            {specialties.slice(0, 20).map(spec => (
              <label key={spec} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedFilters.specialties?.includes(spec) || false}
                  onChange={() => toggleFilter('specialties', spec)}
                />
                <span>{spec}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="results-count">
        <strong>{totalResults}</strong> results found
      </div>
    </aside>
  );
}

export default FilterPanel;