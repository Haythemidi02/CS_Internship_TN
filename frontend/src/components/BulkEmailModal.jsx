import { useState } from 'react';
import { X, Send, Mail, Check, AlertCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function BulkEmailModal({ selectedCompanies, onClose }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sentResults, setSentResults] = useState(null);

  const companiesWithEmail = selectedCompanies.filter(c => c.email);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!body.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);

    try {
      const response = await fetch('http://localhost:8000/api/send-bulk-email', {
        method: 'POST',
        body: JSON.stringify({
          recipients: companiesWithEmail.map(c => ({
            email: c.email,
            company_name: c.company_name
          })),
          subject,
          body
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.status === 'success') {
        setSentResults(data.results);
        toast.success(`Emails prepared for ${companiesWithEmail.length} companies`);
      } else {
        toast.error('Failed to send emails');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content glass bulk-email-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button className="btn-icon modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="bulk-email-header">
          <Mail size={28} className="bulk-email-icon" />
          <div>
            <h2>Send Bulk Email</h2>
            <p>{companiesWithEmail.length} companies selected</p>
          </div>
        </div>

        {sentResults ? (
          <div className="bulk-email-results">
            <div className="results-success">
              <Check size={48} />
              <h3>Emails Sent Successfully!</h3>
              <p>{sentResults.filter(r => r.status === 'simulated_success').length} emails prepared</p>
            </div>
            <div className="results-list">
              {sentResults.map((r, i) => (
                <div key={i} className="result-item">
                  <span className="company">{r.company}</span>
                  <span className="email">{r.email}</span>
                  <span className={`status ${r.status}`}>
                    {r.status === 'simulated_success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  </span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="recipients-list">
              <h4>Recipients</h4>
              <div className="recipient-tags">
                {companiesWithEmail.map((c, i) => (
                  <span key={i} className="recipient-tag">
                    {c.company_name}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Application for Summer Internship"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea
                className="filter-textarea"
                placeholder="Dear HR Team at [Company],&#10;&#10;I am writing to apply for the summer internship position...&#10;&#10;Best regards,"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
              />
            </div>

            <div className="bulk-email-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={sending || companiesWithEmail.length === 0}
              >
                {sending ? <Loader className="spin" size={18} /> : <Send size={18} />}
                {sending ? 'Sending...' : `Send to ${companiesWithEmail.length} companies`}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default BulkEmailModal;
