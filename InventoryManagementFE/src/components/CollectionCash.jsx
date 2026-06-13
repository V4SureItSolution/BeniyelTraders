import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Calendar, DollarSign, List, Filter, RefreshCw, X, Check, Save, User, FileText, Search, CreditCard
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const CollectionCash = () => {
  // State variables
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Tabs: 'outstanding' or 'history'
  const [activeTab, setActiveTab] = useState('outstanding');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'bill', 'invoice', 'hotel_invoice'
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Form fields
  const [formAmountCollected, setFormAmountCollected] = useState('');
  const [formCollectionDate, setFormCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMode, setFormPaymentMode] = useState('Cash');
  const [formNotes, setFormNotes] = useState('');

  // Payment Modes
  const paymentModes = ['Cash', 'UPI', 'Card', 'Net Banking'];

  // Axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch outstanding invoices
      const outRes = await api.get('/collections/outstanding');
      if (outRes.data && outRes.data.success) {
        setOutstanding(outRes.data.outstanding);
      }

      // 2. Fetch collection history
      const histRes = await api.get('/collections');
      if (histRes.data && histRes.data.success) {
        setHistory(histRes.data.collections);
      }
    } catch (err) {
      console.error('Error fetching collection cash data:', err);
      setError(err.response?.data?.error || 'Failed to fetch collection data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCollect = (invoice) => {
    setSelectedInvoice(invoice);
    setFormAmountCollected(invoice.outstanding_amount.toString());
    setFormCollectionDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMode('Cash');
    setFormNotes('');
    setShowModal(true);
  };

  const handleSaveCollection = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    const amount = parseFloat(formAmountCollected) || 0;
    if (amount <= 0) {
      setError('Please provide a valid collection amount.');
      return;
    }

    if (amount > selectedInvoice.outstanding_amount) {
      setError(`Collected amount cannot exceed the outstanding balance of ₹${selectedInvoice.outstanding_amount}`);
      return;
    }

    const payload = {
      invoice_number: selectedInvoice.invoice_number,
      invoice_type: selectedInvoice.invoice_type,
      amount_collected: amount,
      customer_name: selectedInvoice.customer_name,
      customer_phone: selectedInvoice.customer_phone,
      collection_date: formCollectionDate,
      payment_mode: formPaymentMode,
      notes: formNotes
    };

    try {
      const response = await api.post('/collections', payload);
      if (response.data && response.data.success) {
        setSuccess('Payment collected and logged successfully!');
        setShowModal(false);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error saving collection:', err);
      setError(err.response?.data?.error || 'Failed to record collection.');
    }
  };

  // Calculations for stats
  const totalOutstandingAmount = outstanding.reduce((sum, item) => sum + item.outstanding_amount, 0);
  const totalCollectedAmount = history.reduce((sum, log) => sum + log.amount_collected, 0);

  // Filter & Search Logic
  const filteredOutstanding = outstanding.filter(item => {
    const matchesSearch = 
      item.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customer_phone.includes(searchQuery) ||
      item.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || item.invoice_type === filterType;
    
    return matchesSearch && matchesType;
  });

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
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    card: {
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #334155',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    cardTitle: {
      fontSize: '14px',
      color: '#94a3b8',
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: '8px'
    },
    cardValue: {
      fontSize: '26px',
      fontWeight: 'bold',
      color: '#38bdf8'
    },
    tabContainer: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      borderBottom: '1px solid #334155',
      paddingBottom: '12px'
    },
    tab: (active) => ({
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: active ? '#2563eb' : '#1e293b',
      color: active ? '#fff' : '#94a3b8',
      border: 'none',
      outline: 'none'
    }),
    filtersSection: {
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
      border: '1px solid #334155',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '15px',
      alignItems: 'center'
    },
    select: {
      backgroundColor: '#0f172a',
      color: '#fff',
      border: '1px solid #475569',
      padding: '10px 14px',
      borderRadius: '8px',
      outline: 'none',
      fontSize: '14px',
      cursor: 'pointer'
    },
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#0f172a',
      border: '1px solid #475569',
      borderRadius: '8px',
      padding: '0 12px',
      gap: '8px',
      flex: 1,
      minWidth: '200px'
    },
    searchInput: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#fff',
      padding: '10px 0',
      width: '100%',
      outline: 'none',
      fontSize: '14px'
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
    tableContainer: {
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      border: '1px solid #334155',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      textAlign: 'left'
    },
    th: {
      backgroundColor: '#334155',
      color: '#cbd5e1',
      padding: '14px 18px',
      fontSize: '13px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    td: {
      padding: '14px 18px',
      borderTop: '1px solid #334155',
      color: '#f1f5f9',
      fontSize: '14px'
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
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
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
    badge: (type) => {
      let bg = 'rgba(148, 163, 184, 0.2)';
      let text = '#94a3b8';
      if (type === 'bill') {
        bg = 'rgba(16, 185, 129, 0.2)';
        text = '#10b981';
      } else if (type === 'invoice') {
        bg = 'rgba(59, 130, 246, 0.2)';
        text = '#3b82f6';
      } else if (type === 'hotel_invoice') {
        bg = 'rgba(168, 85, 247, 0.2)';
        text = '#a855f7';
      }
      return {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        display: 'inline-block',
        backgroundColor: bg,
        color: text
      };
    }
  };

  return (
    <div style={styles.container}>
      {/* Alert Messages */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '8px', color: '#a7f3d0', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>💵 Collection Cash</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '14px' }}>Track outstanding balances and record cash collection logs</p>
        </div>
        <button 
          style={{ ...styles.button, ...styles.btnSecondary }}
          onClick={fetchData}
        >
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Outstanding Balances</div>
          <div style={{ ...styles.cardValue, color: '#f87171' }}>₹{totalOutstandingAmount.toFixed(2)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Collected Payments</div>
          <div style={{ ...styles.cardValue, color: '#34d399' }}>₹{totalCollectedAmount.toFixed(2)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Pending Bills / Invoices</div>
          <div style={{ ...styles.cardValue, color: '#f59e0b' }}>{outstanding.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button 
          style={styles.tab(activeTab === 'outstanding')}
          onClick={() => setActiveTab('outstanding')}
        >
          ⚠️ Outstanding Invoices ({outstanding.length})
        </button>
        <button 
          style={styles.tab(activeTab === 'history')}
          onClick={() => setActiveTab('history')}
        >
          📜 Collection Log Book ({history.length})
        </button>
      </div>

      {/* Filters (only show in outstanding tab) */}
      {activeTab === 'outstanding' && (
        <div style={styles.filtersSection}>
          <div style={styles.searchBox}>
            <Search size={16} color="#94a3b8" />
            <input 
              type="text"
              placeholder="Search by customer, invoice no, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Invoice Types</option>
            <option value="bill">Bills</option>
            <option value="invoice">Sales Invoices</option>
            <option value="hotel_invoice">Hotel Invoices</option>
          </select>
        </div>
      )}

      {/* Data Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading collection information...</div>
        ) : activeTab === 'outstanding' ? (
          filteredOutstanding.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
              No outstanding invoices found matching the filters.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>No / Code</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Paid</th>
                  <th style={styles.th}>Outstanding</th>
                  <th style={styles.th} style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutstanding.map((item) => (
                  <tr key={`${item.invoice_type}-${item.id}`}>
                    <td style={styles.td}>
                      {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.invoice_number}</td>
                    <td style={styles.td}>
                      <span style={styles.badge(item.invoice_type)}>
                        {item.invoice_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{item.customer_name}</td>
                    <td style={styles.td}>{item.customer_phone || '—'}</td>
                    <td style={styles.td}>₹{item.total_amount.toFixed(2)}</td>
                    <td style={{ ...styles.td, color: '#34d399' }}>₹{item.paid_amount.toFixed(2)}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: '#f87171' }}>₹{item.outstanding_amount.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenCollect(item)}
                        style={{ ...styles.button, ...styles.btnPrimary, padding: '6px 12px', fontSize: '12px', margin: '0 auto' }}
                      >
                        Collect Cash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          history.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
              No collections have been logged yet.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Collection Date</th>
                  <th style={styles.th}>Invoice No</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Collected Amount</th>
                  <th style={styles.th}>Payment Mode</th>
                  <th style={styles.th}>Remaining Bal</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>
                      {new Date(log.collection_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{log.invoice_number}</td>
                    <td style={styles.td}>
                      <span style={styles.badge(log.invoice_type)}>
                        {log.invoice_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '600' }}>{log.customer_name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.customer_phone}</div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: '#34d399' }}>₹{log.amount_collected.toFixed(2)}</td>
                    <td style={styles.td}>{log.payment_mode}</td>
                    <td style={{ ...styles.td, color: log.outstanding_amount > 0 ? '#f87171' : '#cbd5e1' }}>
                      ₹{log.outstanding_amount.toFixed(2)}
                    </td>
                    <td style={styles.td}>{log.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Collect Cash Modal */}
      {showModal && selectedInvoice && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                💵 Record Cash Collection
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#94a3b8' }}>
                Invoice No: <strong style={{ color: '#fff' }}>{selectedInvoice.invoice_number}</strong> ({selectedInvoice.invoice_type})
              </p>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#94a3b8' }}>
                Customer: <strong style={{ color: '#fff' }}>{selectedInvoice.customer_name}</strong> {selectedInvoice.customer_phone && `(${selectedInvoice.customer_phone})`}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>
                Remaining Outstanding: <strong>₹{selectedInvoice.outstanding_amount.toFixed(2)}</strong>
              </p>
            </div>

            <form onSubmit={handleSaveCollection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Collection Date *</label>
                <input 
                  type="date"
                  value={formCollectionDate}
                  onChange={(e) => setFormCollectionDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount Collected (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoice.outstanding_amount}
                  value={formAmountCollected}
                  onChange={(e) => setFormAmountCollected(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Mode *</label>
                <select 
                  value={formPaymentMode}
                  onChange={(e) => setFormPaymentMode(e.target.value)}
                  style={styles.select}
                >
                  {paymentModes.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Additional Notes / Reference</label>
                <textarea 
                  placeholder="Enter reference numbers or remarks..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ ...styles.input, height: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  style={{ ...styles.button, ...styles.btnSecondary }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ ...styles.button, ...styles.btnPrimary }}
                >
                  <Save size={14} /> Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionCash;
