import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, FileText, Calendar, Trash2, AlertTriangle, CheckCircle, Download, Clock, Plus, X 
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Expiry alerts
  const [alerts, setAlerts] = useState({ expired: [], expiring_soon: [], total_alerts: 0 });

  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('GST File');
  const [documentName, setDocumentName] = useState('');
  const [selectedYear, setSelectedYear] = useState('2025-2026'); // for IT returns
  const [expiryDate, setExpiryDate] = useState(''); // for licenses/agreements
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const documentTypes = [
    'GST File',
    'Food Licence File',
    'IT Returns File',
    'MSME Certificate File',
    'Shop Rental Agreement File'
  ];

  const financialYears = [
    '2026-2027',
    '2025-2026',
    '2024-2025',
    '2023-2024',
    '2022-2023',
    '2021-2022'
  ];

  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
  });

  useEffect(() => {
    fetchDocuments();
    fetchAlerts();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/documents');
      if (res.data && res.data.success) {
        setDocuments(res.data.documents);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/documents/alerts');
      if (res.data && res.data.success) {
        setAlerts(res.data.alerts);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!documentName) {
        // Auto-fill document name with filename
        setDocumentName(selectedFile.name.split('.').slice(0, -1).join('.'));
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file || !documentName) {
      setError('Please select a file and enter a name.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // Step 1: Upload physical file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data && uploadRes.data.success) {
        const filePath = uploadRes.data.filePath;

        // Step 2: Save metadata to documents table
        const payload = {
          name: documentName,
          document_type: uploadType,
          file_path: filePath,
          year: uploadType === 'IT Returns File' ? selectedYear : null,
          expiry_date: ['Food Licence File', 'MSME Certificate File', 'Shop Rental Agreement File'].includes(uploadType) && expiryDate ? expiryDate : null
        };

        const saveRes = await api.post('/documents', payload);
        if (saveRes.data && saveRes.data.success) {
          setSuccess('Document uploaded and saved successfully!');
          setShowUploadModal(false);
          resetForm();
          fetchDocuments();
          fetchAlerts();
          setTimeout(() => setSuccess(''), 3000);
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document? The physical file will also be deleted.')) return;
    try {
      const res = await api.delete(`/documents/${id}`);
      if (res.data && res.data.success) {
        setSuccess('Document deleted successfully!');
        fetchDocuments();
        fetchAlerts();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document.');
    }
  };

  const resetForm = () => {
    setDocumentName('');
    setFile(null);
    setExpiryDate('');
    setSelectedYear('2025-2026');
  };

  const styles = {
    container: {
      padding: '30px 40px',
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      background: 'linear-gradient(to right, #60a5fa, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0
    },
    alertsContainer: {
      marginBottom: '30px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    alertBanner: {
      padding: '16px 20px',
      borderRadius: '12px',
      borderLeft: '5px solid',
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    alertExpired: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderLeftColor: '#ef4444',
      color: '#fca5a5',
      border: '1px solid rgba(239, 68, 68, 0.2)'
    },
    alertWarning: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderLeftColor: '#f59e0b',
      color: '#fde047',
      border: '1px solid rgba(245, 158, 11, 0.2)'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '24px'
    },
    sectionCard: {
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #334155',
      paddingBottom: '12px',
      marginBottom: '16px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#60a5fa',
      margin: 0
    },
    docList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    docItem: {
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '10px',
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'transform 0.2s'
    },
    docDetails: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    docName: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#f1f5f9'
    },
    docMeta: {
      fontSize: '12px',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '10px 18px',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none'
    },
    btnPrimary: {
      backgroundColor: '#2563eb',
      color: '#fff',
    },
    btnSecondary: {
      backgroundColor: '#475569',
      color: '#fff',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: '#1e293b',
      border: '1px solid #475569',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '500px',
      padding: '24px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
    },
    formGroup: {
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '13px',
      color: '#94a3b8',
      fontWeight: '500'
    },
    input: {
      backgroundColor: '#0f172a',
      color: '#fff',
      border: '1px solid #475569',
      padding: '10px 14px',
      borderRadius: '8px',
      outline: 'none',
      fontSize: '14px'
    },
    expiryAlertBadge: {
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '12px',
      fontWeight: 'bold',
      marginTop: '4px',
      display: 'inline-block'
    }
  };

  const getDocTypeIcon = (type) => {
    return <FileText size={20} style={{ color: '#60a5fa' }} />;
  };

  const isExpiringSoon = (expiryStr) => {
    if (!expiryStr) return false;
    const expiry = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  const isExpired = (expiryStr) => {
    if (!expiryStr) return false;
    const expiry = new Date(expiryStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  return (
    <div style={styles.container}>
      {/* Alert Banner / Toast Messages */}
      {success && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '8px', color: '#a7f3d0', marginBottom: '20px' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Expiry alerts list */}
      {alerts.total_alerts > 0 && (
        <div style={styles.alertsContainer}>
          {alerts.expired.map(alert => (
            <div key={`exp-${alert.id}`} style={{ ...styles.alertBanner, ...styles.alertExpired }}>
              <AlertTriangle size={24} />
              <div>
                <strong style={{ display: 'block', fontSize: '15px' }}>Document Expired: {alert.name} ({alert.document_type})</strong>
                <span style={{ fontSize: '13px', opacity: 0.9 }}>
                  Expired on {new Date(alert.expiry_date).toLocaleDateString('en-IN')} ({alert.days_expired} days ago). Please upload a renewed document immediately.
                </span>
              </div>
            </div>
          ))}

          {alerts.expiring_soon.map(alert => (
            <div key={`soon-${alert.id}`} style={{ ...styles.alertBanner, ...styles.alertWarning }}>
              <Clock size={24} />
              <div>
                <strong style={{ display: 'block', fontSize: '15px' }}>Document Expiring Soon: {alert.name} ({alert.document_type})</strong>
                <span style={{ fontSize: '13px', opacity: 0.9 }}>
                  Will expire on {new Date(alert.expiry_date).toLocaleDateString('en-IN')} (in {alert.days_left} days).
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📁 Document Manager</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '14px' }}>Upload and check licence expiries</p>
        </div>
        <button 
          style={{ ...styles.button, ...styles.btnPrimary }}
          onClick={() => { resetForm(); setShowUploadModal(true); }}
        >
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {/* Document grid categorization */}
      <div style={styles.grid}>
        {documentTypes.map(type => {
          const typeDocs = documents.filter(d => d.document_type === type);
          return (
            <div key={type} style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>{type.replace(' File', '')}</h3>
                <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '2px 8px', borderRadius: '10px' }}>
                  {typeDocs.length} files
                </span>
              </div>

              <div style={styles.docList}>
                {typeDocs.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                    No uploads yet.
                  </div>
                ) : (
                  typeDocs.map(doc => {
                    const expired = isExpired(doc.expiry_date);
                    const expiring = isExpiringSoon(doc.expiry_date);
                    return (
                      <div key={doc.id} style={styles.docItem}>
                        <div style={styles.docDetails}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getDocTypeIcon(doc.document_type)}
                            <span style={styles.docName}>{doc.name}</span>
                          </div>
                          <div style={styles.docMeta}>
                            {doc.year && <span>FY: {doc.year}</span>}
                            {doc.expiry_date && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={12} />
                                Exp: {new Date(doc.expiry_date).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          {expired && (
                            <span style={{ ...styles.expiryAlertBadge, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                              ⚠️ Expired
                            </span>
                          )}
                          {expiring && (
                            <span style={{ ...styles.expiryAlertBadge, backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                              ⏳ Expiring Soon
                            </span>
                          )}
                        </div>

                        {/* File Action Controls */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <a 
                            href={`http://localhost:5000${doc.file_path}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#60a5fa', cursor: 'pointer' }}
                            title="Download/View File"
                          >
                            <Download size={16} />
                          </a>
                          <button 
                            onClick={() => handleDelete(doc.id)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>📤 Upload Business File</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Document Category *</label>
                <select 
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  style={{ ...styles.input, cursor: 'pointer' }}
                >
                  {documentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Document Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. GST Certificate 2025"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              {/* Year Select for IT Returns */}
              {uploadType === 'IT Returns File' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Financial Year *</label>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={styles.input}
                  >
                    {financialYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Expiry Date Select for Licences / Agreements */}
              {['Food Licence File', 'MSME Certificate File', 'Shop Rental Agreement File'].includes(uploadType) && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Date *</label>
                  <input 
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Choose File *</label>
                <input 
                  type="file"
                  onChange={handleFileChange}
                  style={{ color: '#cbd5e1', fontSize: '14px', marginTop: '4px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  style={{ ...styles.button, ...styles.btnSecondary }}
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ ...styles.button, ...styles.btnPrimary }}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
