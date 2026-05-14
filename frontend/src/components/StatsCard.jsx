import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

function StatsCard({ title, value, icon: Icon, change, changeType = 'neutral', color = 'primary' }) {
  const colorMap = {
    primary: 'var(--primary-color)',
    success: 'var(--success-color)',
    warning: 'var(--accent-color)',
    danger: 'var(--danger-color)'
  };

  const getTrendIcon = () => {
    if (changeType === 'up') return <TrendingUp size={16} />;
    if (changeType === 'down') return <TrendingDown size={16} />;
    return <Minus size={16} />;
  };

  return (
    <motion.div
      className="stats-card glass"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="stats-icon" style={{ color: colorMap[color] }}>
        <Icon size={24} />
      </div>
      <div className="stats-content">
        <span className="stats-title">{title}</span>
        <span className="stats-value">{value}</span>
        {change !== undefined && (
          <span className={`stats-change ${changeType}`}>
            {getTrendIcon()}
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function ApplicationStats({ applications = [] }) {
  const total = applications.length;
  const sent = applications.filter(a => a.status === 'Sent').length;
  const accepted = applications.filter(a => a.status === 'Accepted').length;
  const rejected = applications.filter(a => a.status === 'Rejected').length;

  return (
    <div className="stats-grid">
      <StatsCard
        title="Total Applications"
        value={total}
        icon={FileText}
        color="primary"
      />
      <StatsCard
        title="Sent"
        value={sent}
        icon={Clock}
        color="warning"
      />
      <StatsCard
        title="Accepted"
        value={accepted}
        icon={CheckCircle}
        color="success"
      />
      <StatsCard
        title="Rejected"
        value={rejected}
        icon={XCircle}
        color="danger"
      />
    </div>
  );
}

export default StatsCard;
export { ApplicationStats };