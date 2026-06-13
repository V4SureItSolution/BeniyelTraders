import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Trash2, Edit, Calendar, DollarSign, List, Filter, RefreshCw, X, Check, Save 
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const ExpensesPage = () => {
  // State variables
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Date filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Utilities');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMode, setFormPaymentMode] = useState('Cash');
  const [formNotes, setFormNotes] = useState('');
  
  // Statistics states
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [categoryStats, setCategoryStats] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);

  // Categories list
  const categories = ['Rent', 'Utilities', 'Salaries', 'Food', 'Travel', 'Material Purchase', 'Marketing', 'Miscellaneous'];
  const paymentModes = ['Cash', 'UPI', 'Card', 'Net Banking'];

  // Axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, filterCategory]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch expenses
      let url = `/expenses?month=${selectedMonth}&year=${selectedYear}`;
      if (filterCategory !== 'all') {
        url += `&category=${encodeURIComponent(filterCategory)}`;
      }
      const expRes = await api.get(url);
      if (expRes.data && expRes.data.success) {
        setExpenses(expRes.data.expenses);
      }

      // Fetch statistics
      const statsRes = await api.get(`/expenses/stats?month=${selectedMonth}&year=${selectedYear}`);
      if (statsRes.data && statsRes.data.success) {
        setMonthlyTotal(statsRes.data.monthly_total);
        setDailyTotal(statsRes.data.daily_total);
        setCategoryStats(statsRes.data.category_breakdown);
        setPaymentStats(statsRes.data.payment_breakdown);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err.response?.data?.error || 'Failed to fetch expenses data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle || !formAmount || parseFloat(formAmount) <= 0) {
      setError('Please provide a valid title and amount.');
      return;
    }

    const payload = {
      title: formTitle,
      amount: parseFloat(formAmount),
      category: formCategory,
      date: formDate,
      payment_mode: formPaymentMode,
      notes: formNotes
    };

    try {
      let response;
      if (editingExpense) {
        response = await api.put(`/expenses/${editingExpense.id}`, payload);
      } else {
        response = await api.post('/expenses', payload);
      }

      if (response.data && response.data.success) {
        setSuccess(editingExpense ? 'Expense updated successfully!' : 'Expense added successfully!');
        resetForm();
        setShowModal(false);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.response?.data?.error || 'Failed to save expense.');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormTitle(expense.title);
    setFormAmount(expense.amount);
    setFormCategory(expense.category);
    setFormDate(expense.date);
    setFormPaymentMode(expense.payment_mode);
    setFormNotes(expense.notes || '');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await api.delete(`/expenses/${id}`);
      if (res.data && res.data.success) {
        setSuccess('Expense deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Failed to delete expense.');
    }
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormAmount('');
    setFormCategory('Utilities');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMode('Cash');
    setFormNotes('');
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
    input: {
      backgroundColor: '#0f172a',
      color: '#fff',
      border: '1px solid #475569',
      padding: '10px 14px',
      borderRadius: '8px',
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
    badge: {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      display: 'inline-block'
    }
  };

  const getCategoryColor = (cat) => {
    const colors = {
      'Rent': { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
      'Utilities': { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
      'Salaries': { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' },
      'Food': { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
      'Travel': { bg: 'rgba(139, 92, 246, 0.2)', text: '#8b5cf6' },
      'Material Purchase': { bg: 'rgba(236, 72, 153, 0.2)', text: '#ec4899' },
      'Marketing': { bg: 'rgba(6, 182, 212, 0.2)', text: '#06b6d4' },
      'Miscellaneous': { bg: 'rgba(107, 114, 128, 0.2)', text: '#6b7280' }
    };
    return colors[cat] || { bg: 'rgba(255, 255, 255, 0.1)', text: '#fff' };
  };

  return (
    <div style={styles.container}>
      {/* Messages */}
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
          <h1 style={styles.title}>📊 Daily & Monthly Expenses</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '14px' }}>Track and manage all shop expenses</p>
        </div>
        <button 
          style={{ ...styles.button, ...styles.btnPrimary }}
          onClick={() => { resetForm(); setShowModal(true); }}
        >
          <Plus size={16} /> Log Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Today's Expenses</div>
          <div style={styles.cardValue}>₹{dailyTotal.toFixed(2)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Monthly Total ({selectedMonth}/{selectedYear})</div>
          <div style={styles.cardValue}>₹{monthlyTotal.toFixed(2)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Transactions Listed</div>
          <div style={{ ...styles.cardValue, color: '#f59e0b' }}>{expenses.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
          <Filter size={16} />
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Filters:</span>
        </div>
        
        {/* Month Selector */}
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          style={styles.select}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i+1} value={i+1}>
              {new Date(0, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>

        {/* Year Selector */}
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={styles.select}
        >
          {[2024, 2025, 2026, 2027].map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>

        {/* Category Filter */}
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button 
          style={{ ...styles.button, ...styles.btnSecondary, padding: '10px 12px' }}
          onClick={fetchData}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Expenses Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading expenses data...</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
            No expense records found for the selected period.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Payment Mode</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Notes</th>
                <th style={styles.th} style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => {
                const color = getCategoryColor(expense.category);
                return (
                  <tr key={expense.id}>
                    <td style={styles.td}>
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{expense.title}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: color.bg, color: color.text }}>
                        {expense.category}
                      </span>
                    </td>
                    <td style={styles.td}>{expense.payment_mode}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: '#38bdf8' }}>₹{expense.amount.toFixed(2)}</td>
                    <td style={styles.td}>{expense.notes || '—'}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleEdit(expense)}
                          style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Log/Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                {editingExpense ? '✏️ Edit Expense Log' : '➕ Log New Expense'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Expense Date *</label>
                <input 
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Title / Description *</label>
                <input 
                  type="text"
                  placeholder="e.g. Electricity bill paid"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Category *</label>
                <select 
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={styles.select}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
                <label style={styles.label}>Additional Notes (Optional)</label>
                <textarea 
                  placeholder="Enter details..."
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
                  <Save size={14} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
