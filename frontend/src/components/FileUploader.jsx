import React, { useState, useCallback } from 'react';
import { UploadCloud, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

function FileUploader({ label, file, setFile, accept = ".pdf,.doc,.docx", required = false }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = accept.split(',').map(t => t.trim());
    const fileType = selectedFile.name.split('.').pop().toLowerCase();

    if (!allowedTypes.some(type => type.includes(fileType))) {
      setError('Invalid file type. Please upload PDF, DOC, or DOCX');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB');
      return;
    }

    setError('');
    setFile(selectedFile);
  }, [accept, setFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleChange = useCallback((e) => {
    handleFile(e.target.files[0]);
  }, [handleFile]);

  const removeFile = useCallback(() => {
    setFile(null);
    setError('');
  }, [setFile]);

  return (
    <div className="file-uploader">
      <label>{label}{required && <span className="required">*</span>}</label>

      {file ? (
        <motion.div
          className="file-preview"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="file-info">
            <File size={24} className="file-icon" />
            <div className="file-details">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <div className="file-actions">
            <span className="file-check"><CheckCircle size={18} /></span>
            <button type="button" className="btn-remove" onClick={removeFile}>
              <X size={18} />
            </button>
          </div>
        </motion.div>
      ) : (
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${error ? 'has-error' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            id={`file-${label}`}
          />
          <label htmlFor={`file-${label}`} className="drop-label">
            <UploadCloud size={32} />
            <p>Drag & drop or <span>browse</span></p>
            <span className="file-types">{accept.replace(/[,.]/g, ' ')}</span>
          </label>
        </div>
      )}

      {error && (
        <motion.div
          className="file-error"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={14} />
          {error}
        </motion.div>
      )}
    </div>
  );
}

export default FileUploader;