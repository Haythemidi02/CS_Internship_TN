import { Star, MapPin, Mail, Heart, Check, Sparkles, Globe, Building } from 'lucide-react';
import { motion } from 'framer-motion';

function InternshipCard({
  internship,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onApply,
  onDirectEmail,
  searchTerm
}) {
  const parseSpecialties = (specs) => {
    if (!specs || typeof specs !== 'string') return [];
    return specs.split(/[,/&-]/).map(s => s.trim()).filter(s => s.length > 0);
  };

  const highlightText = (text, term) => {
    if (!term || !text) return text;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  const specialties = parseSpecialties(internship.specialties);

  // Get priority color class
  const getPriorityClass = (priority) => {
    if (!priority) return '';
    if (priority.toLowerCase().includes('a') || priority.toLowerCase().includes('top')) return 'priority-high';
    if (priority.toLowerCase().includes('b') || priority.toLowerCase().includes('high')) return 'priority-medium';
    if (priority.toLowerCase().includes('c') || priority.toLowerCase().includes('medium')) return 'priority-normal';
    return 'priority-low';
  };

  return (
    <motion.div
      className={`card glass internship-card ${isSelected ? 'selected' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      {/* CV Match Score */}
      {internship.cv_match && (
        <div className="card-cv-match">
          <Sparkles size={12} />
          <span>{internship.cv_match.score}% match</span>
        </div>
      )}

      <div className="card-header">
        <div className="card-select">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(internship.id)}
          />
        </div>
        <div className="card-title">
          <h3 className="company-name">
            {highlightText(internship.company_name, searchTerm)}
          </h3>
          {internship.score && (
            <div className="score-badge">
              <Star size={12} fill="currentColor" />
              <span>{internship.score}</span>
            </div>
          )}
        </div>
        <button
          className={`btn-favorite ${isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(internship)}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <p className="subject">
        {highlightText(internship.subject || internship.tailored_angle || 'No details provided.', searchTerm)}
      </p>

      {/* Location Info */}
      <div className="card-location-row">
        {(internship.country || internship.city || internship.governorate) && (
          <div className="location-info">
            <Globe size={12} />
            <span className="location-country">{internship.country}</span>
            {internship.city && <span className="location-sep">-</span>}
            {internship.city && <span className="location-city">{internship.city}</span>}
          </div>
        )}
        {internship.company_type && (
          <div className="company-type-badge">
            <Building size={12} />
            <span>{internship.company_type}</span>
          </div>
        )}
      </div>

      {internship.address && !internship.city && (
        <div className="card-location">
          <MapPin size={14} />
          <span>{internship.address}</span>
        </div>
      )}

      {/* Priority Badge */}
      {internship.priority && (
        <div className={`priority-indicator ${getPriorityClass(internship.priority)}`}>
          {internship.priority}
        </div>
      )}

      <div className="specialties">
        {specialties.slice(0, 3).map((spec, i) => (
          <span key={i} className="specialty-tag">
            {highlightText(spec, searchTerm)}
          </span>
        ))}
        {specialties.length > 3 && (
          <span className="specialty-tag more">+{specialties.length - 3}</span>
        )}
      </div>

      <div className="card-actions">
        <button className="btn btn-primary" onClick={() => onApply(internship)} style={{ flex: 1 }}>
          View & Apply
        </button>
        {internship.email && (
          <button
            className="btn btn-secondary"
            onClick={() => onDirectEmail(internship.email, internship.company_name)}
            title="Direct Email"
          >
            <Mail size={18} />
          </button>
        )}
      </div>

      {isSelected && (
        <motion.div
          className="selected-indicator"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Check size={16} />
        </motion.div>
      )}
    </motion.div>
  );
}

export default InternshipCard;
