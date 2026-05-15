import { Link } from 'react-router-dom';
import { Terminal, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="auth-page">
      <motion.div
        className="auth-card glass"
        style={{ textAlign: 'center' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Terminal size={48} style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--primary-color)', lineHeight: 1 }}>404</h1>
        <h2 style={{ marginBottom: '0.5rem' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
