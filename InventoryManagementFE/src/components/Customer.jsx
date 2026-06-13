// CustomerDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

const CustomerDetailsPage = () => {
  const navigate = useNavigate();
  
  // App states
  const [activeSubTab, setActiveSubTab] = useState('walkin'); // 'walkin' or 'buyers'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Walk-in Customers states
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Bill modal states
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBills, setCustomerBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Registered Buyers states
  const [buyers, setBuyers] = useState([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  
  // Buyer Modal states
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [buyerSuccess, setBuyerSuccess] = useState('');
  const [buyerError, setBuyerError] = useState('');

  // Buyer Form fields
  const [buyerName, setBuyerName] = useState('');
  const [buyerCompanyName, setBuyerCompanyName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerGSTIN, setBuyerGSTIN] = useState('');
  const [buyerPAN, setBuyerPAN] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerShippingAddress, setBuyerShippingAddress] = useState('');
  const [buyerCreditLimit, setBuyerCreditLimit] = useState('');
  const [buyerPaymentTerms, setBuyerPaymentTerms] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchAllCustomers();
    fetchBuyers();
  }, []);

  const fetchAllCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let allBills = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(`${API_BASE_URL}/billing/bills?page=${page}&per_page=100`);
        if (!response.ok) throw new Error('Failed to fetch bills');
        
        const data = await response.json();
        allBills = [...allBills, ...data.bills];
        hasMore = page < data.pages;
        page++;
      }
      
      const customerMap = new Map();
      allBills.forEach(bill => {
        const customerKey = bill.customer?.phone || bill.customer?.name || bill.customerName;
        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            id: bill.id,
            customerName: bill.customer?.name || bill.customerName || 'Unknown',
            customerPhone: bill.customer?.phone || bill.customerPhone || '',
            customerEmail: bill.customer?.email || bill.customerEmail || '',
            customerGST: bill.customer?.gst || bill.customerGST || '',
            customerAddress: bill.customer?.address || bill.customerAddress || '',
            customerType: bill.customer?.type || bill.customerType || 'regular',
            vehicleName: bill.vehicle?.name || bill.vehicleName || '',
            vehicleNumber: bill.vehicle?.number || bill.vehicleNumber || '',
            totalSpent: bill.summary?.total || bill.total || 0,
            billCount: 1,
            lastBillDate: bill.createdAt || new Date().toISOString()
          });
        } else {
          const existing = customerMap.get(customerKey);
          existing.totalSpent += (bill.summary?.total || bill.total || 0);
          existing.billCount += 1;
          if (bill.createdAt && new Date(bill.createdAt) > new Date(existing.lastBillDate)) {
            existing.lastBillDate = bill.createdAt;
          }
        }
      });
      
      const customersList = Array.from(customerMap.values());
      setCustomers(customersList);
      setFilteredCustomers(customersList);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyers = async () => {
    try {
      setLoadingBuyers(true);
      const response = await fetch(`${API_BASE_URL}/buyers`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBuyers(data.buyers);
        }
      }
    } catch (err) {
      console.error('Error fetching buyers:', err);
    } finally {
      setLoadingBuyers(false);
    }
  };

  // Filter walk-in customers
  useEffect(() => {
    let filtered = [...customers];
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        (customer.customerName && customer.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.customerPhone && customer.customerPhone.includes(searchTerm)) ||
        (customer.customerEmail && customer.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.vehicleNumber && customer.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.customerGST && customer.customerGST.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (selectedCustomerType !== 'all') {
      filtered = filtered.filter(customer => customer.customerType === selectedCustomerType);
    }
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCustomerType, customers]);

  // Walk-in pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handleViewCustomerBills = async (customer) => {
    setSelectedCustomer(customer);
    setShowBillModal(true);
    setLoadingBills(true);
    try {
      let allBills = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await fetch(`${API_BASE_URL}/billing/bills?page=${page}&per_page=100`);
        if (!response.ok) throw new Error('Failed to fetch bills');
        const data = await response.json();
        
        const customerBillsData = data.bills.filter(bill => {
          const billPhone = bill.customer?.phone || bill.customerPhone;
          const billName = bill.customer?.name || bill.customerName;
          return (billPhone && billPhone === customer.customerPhone) ||
                 (billName && billName === customer.customerName);
        });
        allBills = [...allBills, ...customerBillsData];
        hasMore = page < data.pages;
        page++;
      }
      setCustomerBills(allBills);
    } catch (err) {
      console.error('Error fetching customer bills:', err);
      setError('Failed to fetch customer bills');
    } finally {
      setLoadingBills(false);
    }
  };

  const closeBillModal = () => {
    setShowBillModal(false);
    setSelectedCustomer(null);
    setCustomerBills([]);
  };

  // Open Add Buyer Form Modal
  const handleOpenAddBuyer = () => {
    setEditingBuyer(null);
    setBuyerName('');
    setBuyerCompanyName('');
    setBuyerPhone('');
    setBuyerEmail('');
    setBuyerGSTIN('');
    setBuyerPAN('');
    setBuyerState('');
    setBuyerAddress('');
    setBuyerShippingAddress('');
    setBuyerCreditLimit('');
    setBuyerPaymentTerms('');
    setBuyerError('');
    setBuyerSuccess('');
    setShowBuyerModal(true);
  };

  // Open Edit Buyer Form Modal
  const handleOpenEditBuyer = (buyer) => {
    setEditingBuyer(buyer);
    setBuyerName(buyer.name || '');
    setBuyerCompanyName(buyer.company_name || '');
    setBuyerPhone(buyer.phone || '');
    setBuyerEmail(buyer.email || '');
    setBuyerGSTIN(buyer.gstin || '');
    setBuyerPAN(buyer.pan || '');
    setBuyerState(buyer.state || '');
    setBuyerAddress(buyer.address || '');
    setBuyerShippingAddress(buyer.shipping_address || '');
    setBuyerCreditLimit(buyer.credit_limit || '');
    setBuyerPaymentTerms(buyer.payment_terms || '');
    setBuyerError('');
    setBuyerSuccess('');
    setShowBuyerModal(true);
  };

  // Handle Save (Add/Edit) Buyer
  const handleSaveBuyer = async (e) => {
    e.preventDefault();
    setBuyerError('');
    setBuyerSuccess('');

    if (!buyerName.trim()) {
      setBuyerError('Buyer name is required.');
      return;
    }

    const payload = {
      name: buyerName,
      company_name: buyerCompanyName,
      phone: buyerPhone,
      email: buyerEmail,
      gstin: buyerGSTIN,
      pan: buyerPAN,
      state: buyerState,
      address: buyerAddress,
      shipping_address: buyerShippingAddress,
      credit_limit: parseFloat(buyerCreditLimit) || 0.0,
      payment_terms: buyerPaymentTerms
    };

    try {
      let url = `${API_BASE_URL}/buyers`;
      let method = 'POST';
      if (editingBuyer) {
        url += `/${editingBuyer.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save buyer.');
      }

      setBuyerSuccess(editingBuyer ? 'Buyer updated successfully!' : 'Buyer registered successfully!');
      fetchBuyers();
      setTimeout(() => {
        setShowBuyerModal(false);
      }, 1500);
    } catch (err) {
      setBuyerError(err.message);
    }
  };

  // Delete Buyer
  const handleDeleteBuyer = async (buyerId) => {
    if (!window.confirm('Are you sure you want to delete this buyer profile?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/buyers/${buyerId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchBuyers();
      } else {
        alert(data.error || 'Failed to delete buyer.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error during delete.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  const getCustomerTypeBadgeStyle = (type) => {
    const styles = {
      regular: {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1))',
        color: '#ffffff',
        border: '1px solid rgba(59, 130, 246, 0.5)'
      },
      internal: {
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(168, 85, 247, 0.1))',
        color: '#ffffff',
        border: '1px solid rgba(168, 85, 247, 0.5)'
      }
    };
    return styles[type] || styles.regular;
  };

  // Filter buyers list
  const filteredBuyers = buyers.filter(b => {
    const q = buyerSearchQuery.toLowerCase();
    return b.name.toLowerCase().includes(q) ||
           (b.company_name && b.company_name.toLowerCase().includes(q)) ||
           (b.phone && b.phone.includes(q)) ||
           (b.gstin && b.gstin.toLowerCase().includes(q)) ||
           (b.pan && b.pan.toLowerCase().includes(q));
  });

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '32px 24px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .table-container {
          overflow-x: auto;
          animation: fadeIn 0.5s ease;
        }
        .customer-row {
          transition: all 0.3s ease;
        }
        .customer-row:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        button {
          transition: all 0.3s ease;
        }
        button:active {
          transform: scale(0.97);
        }
        input, select, textarea {
          transition: all 0.3s ease;
        }
        input:focus, select:focus, textarea:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        .modal-content {
          background: #1e293b;
          border: 1px solid #334155;
          color: #fff;
          border-radius: 20px;
          max-width: 95%;
          width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
      `}</style>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
              👥 Customer & Buyer Database
            </h1>
            <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '15px' }}>
              Manage walk-in retail customers and B2B registered buyers
            </p>
          </div>
          {activeSubTab === 'buyers' && (
            <button
              onClick={handleOpenAddBuyer}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ➕ Register New Buyer
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveSubTab('walkin')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'walkin' ? '#2563eb' : '#1e293b',
              color: activeSubTab === 'walkin' ? '#fff' : '#94a3b8',
              border: 'none'
            }}
          >
            👤 Walk-in Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('buyers')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'buyers' ? '#2563eb' : '#1e293b',
              color: activeSubTab === 'buyers' ? '#fff' : '#94a3b8',
              border: 'none'
            }}
          >
            🏢 B2B Registered Buyers ({buyers.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ 
          background: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          padding: '20px',
          marginBottom: '24px'
        }}>
          {activeSubTab === 'walkin' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>
                  🔍 Search Walk-in Customer
                </label>
                <input
                  type="text"
                  placeholder="Search by name, phone, email, GST, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '10px',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>
                  🏷️ Customer Type
                </label>
                <select
                  value={selectedCustomerType}
                  onChange={(e) => setSelectedCustomerType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '10px',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="regular">Regular</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>
                🔍 Search Registered Buyers
              </label>
              <input
                type="text"
                placeholder="Search by buyer name, company, phone, GSTIN, or PAN..."
                value={buyerSearchQuery}
                onChange={(e) => setBuyerSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && activeSubTab === 'walkin' && (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            <p style={{ marginTop: '16px', color: '#94a3b8' }}>Loading customer details...</p>
          </div>
        )}

        {/* Walk-in Customers View */}
        {activeSubTab === 'walkin' && !loading && (
          <div style={{ 
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#334155' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>S.No</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Customer Name</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Contact Info</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>GST Number</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Customer Type</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Vehicle Details</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Total Spent</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Bill Count</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Last Bill Date</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    currentCustomers.map((customer, index) => {
                      const serialNumber = indexOfFirstItem + index + 1;
                      return (
                        <tr 
                          key={index} 
                          className="customer-row"
                          style={{ borderTop: '1px solid #334155' }}
                        >
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px', fontWeight: '600', color: '#fff', fontSize: '12px' }}>
                              {serialNumber}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>{customer.customerName}</div>
                            {customer.customerAddress && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                📍 {customer.customerAddress.length > 30 ? customer.customerAddress.substring(0, 30) + '...' : customer.customerAddress}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '13px', color: '#ffffff' }}>📞 {customer.customerPhone || '—'}</div>
                            {customer.customerEmail && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>✉️ {customer.customerEmail}</div>}
                          </td>
                          <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: '#fbbf24' }}>
                            {customer.customerGST || '—'}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span className="badge" style={getCustomerTypeBadgeStyle(customer.customerType)}>
                              {customer.customerType === 'regular' ? '👤 Regular' : '🏢 Internal'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {customer.vehicleNumber ? (
                              <>
                                <div style={{ fontSize: '13px', color: '#ffffff', fontFamily: 'monospace' }}>🚗 {customer.vehicleNumber}</div>
                                {customer.vehicleName && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{customer.vehicleName}</div>}
                              </>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: '#34d399' }}>
                            {formatCurrency(customer.totalSpent)}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <span style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                              {customer.billCount}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                            {formatDate(customer.lastBillDate)}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleViewCustomerBills(customer)}
                              style={{ 
                                background: '#2563eb',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                color: '#ffffff'
                              }}
                            >
                              📋 View Bills
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Walk-in Pagination */}
            {totalPages > 1 && (
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                    disabled={currentPage === 1}
                    style={{ background: '#334155', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Prev
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                    disabled={currentPage === totalPages}
                    style={{ background: '#334155', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Page {currentPage} of {totalPages}</span>
              </div>
            )}
          </div>
        )}

        {/* Registered Buyers View */}
        {activeSubTab === 'buyers' && (
          <div style={{ 
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            {loadingBuyers ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                <p style={{ marginTop: '16px', color: '#94a3b8' }}>Loading registered buyers...</p>
              </div>
            ) : (
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#334155' }}>
                    <tr>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Buyer Name</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Company Details</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Contact Info</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>GST / PAN</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>State</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Credit Limit</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Payment Terms</th>
                      <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuyers.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                          No registered buyers found.
                        </td>
                      </tr>
                    ) : (
                      filteredBuyers.map((buyer) => (
                        <tr key={buyer.id} className="customer-row" style={{ borderTop: '1px solid #334155' }}>
                          <td style={{ padding: '16px 20px', fontWeight: '600', color: '#fff' }}>
                            {buyer.name}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '14px', color: '#ffffff' }}>{buyer.company_name || '—'}</div>
                            {buyer.address && <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>📍 {buyer.address}</div>}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '13px' }}>📞 {buyer.phone || '—'}</div>
                            {buyer.email && <div style={{ fontSize: '11px', color: '#94a3b8' }}>✉️ {buyer.email}</div>}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#fbbf24' }}>GST: {buyer.gstin || '—'}</div>
                            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1', marginTop: '2px' }}>PAN: {buyer.pan || '—'}</div>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                            {buyer.state || '—'}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: '#38bdf8' }}>
                            {formatCurrency(buyer.credit_limit)}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                            {buyer.payment_terms || '—'}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleOpenEditBuyer(buyer)}
                                style={{ background: '#475569', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteBuyer(buyer.id)}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Walk-in Bill Details Modal */}
      {showBillModal && selectedCustomer && (
        <div className="modal-overlay" onClick={closeBillModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div style={{ 
              padding: '24px 28px', 
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                  Bill Details for {selectedCustomer.customerName}
                </h2>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                  <span>📞 {selectedCustomer.customerPhone || 'N/A'}</span>
                  <span>🏷️ GST: {selectedCustomer.customerGST || 'N/A'}</span>
                  <span>📄 Total Bills: {customerBills.length}</span>
                </div>
              </div>
              <button onClick={closeBillModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {loadingBills ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#334155' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>S.No</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>Bill ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>Bill Number</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>Vehicle</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>Total</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerBills.map((bill, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>{index + 1}</td>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>#{bill.id}</td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>{bill.billNumber || 'N/A'}</td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>{formatDate(bill.createdAt)}</td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#cbd5e1' }}>
                            {bill.vehicle?.number || bill.vehicleNumber || '—'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#34d399', textAlign: 'right' }}>
                            {formatCurrency(bill.summary?.total || bill.total || 0)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              background: (bill.payment?.status || bill.paymentStatus) === 'paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: (bill.payment?.status || bill.paymentStatus) === 'paid' ? '#10b981' : '#ef4444'
                            }}>
                              {bill.payment?.status || bill.paymentStatus || 'unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Buyer Modal */}
      {showBuyerModal && (
        <div className="modal-overlay" onClick={() => setShowBuyerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                {editingBuyer ? '✏️ Edit Buyer Details' : '🏢 Register New B2B Buyer'}
              </h2>
              <button onClick={() => setShowBuyerModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {buyerError && (
              <div style={{ padding: '12px 24px', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderBottom: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', fontSize: '14px' }}>
                ⚠️ {buyerError}
              </div>
            )}
            {buyerSuccess && (
              <div style={{ padding: '12px 24px', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderBottom: '1px solid rgba(16, 185, 129, 0.5)', color: '#a7f3d0', fontSize: '14px' }}>
                ✅ {buyerSuccess}
              </div>
            )}

            <form onSubmit={handleSaveBuyer} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Buyer Name *</label>
                  <input 
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Company Name</label>
                  <input 
                    type="text"
                    value={buyerCompanyName}
                    onChange={(e) => setBuyerCompanyName(e.target.value)}
                    placeholder="e.g. Acme Enterprises Ltd"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Phone Number</label>
                  <input 
                    type="text"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Email Address</label>
                  <input 
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="e.g. buyer@company.com"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>GSTIN</label>
                  <input 
                    type="text"
                    value={buyerGSTIN}
                    onChange={(e) => setBuyerGSTIN(e.target.value.toUpperCase())}
                    placeholder="e.g. 29AAAAA1111A1Z1"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>PAN</label>
                  <input 
                    type="text"
                    value={buyerPAN}
                    onChange={(e) => setBuyerPAN(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>State / Region</label>
                  <input 
                    type="text"
                    value={buyerState}
                    onChange={(e) => setBuyerState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Credit Limit (₹)</label>
                  <input 
                    type="number"
                    value={buyerCreditLimit}
                    onChange={(e) => setBuyerCreditLimit(e.target.value)}
                    placeholder="0.00"
                    style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8' }}>Payment Terms / Details</label>
                <input 
                  type="text"
                  value={buyerPaymentTerms}
                  onChange={(e) => setBuyerPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30, Cash on Delivery"
                  style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8' }}>Billing Address</label>
                <textarea 
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Enter billing address..."
                  style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none', height: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8' }}>Shipping Address (if different)</label>
                <textarea 
                  value={buyerShippingAddress}
                  onChange={(e) => setBuyerShippingAddress(e.target.value)}
                  placeholder="Enter shipping address..."
                  style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none', height: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowBuyerModal(false)}
                  style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Save Buyer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailsPage;