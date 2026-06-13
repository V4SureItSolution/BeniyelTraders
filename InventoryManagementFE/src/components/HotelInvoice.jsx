import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Plus, Trash2, Printer, Save, RefreshCw, X, ChevronRight, FileText 
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const HotelInvoicePage = () => {
  // Lists
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Creation States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  
  // Invoice Items
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Buyer Autocomplete/Search
  const [buyersList, setBuyersList] = useState([]);
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);

  // View Details Modal
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
  });

  useEffect(() => {
    fetchInvoices();
    fetchBuyers();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hotel-invoices');
      if (res.data && res.data.success) {
        setInvoices(res.data.items);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to fetch hotel invoices.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyers = async () => {
    try {
      const res = await api.get('/buyers');
      if (res.data && res.data.success) {
        setBuyersList(res.data.buyers);
      }
    } catch (err) {
      console.error('Error fetching buyers:', err);
    }
  };

  // Product Search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchProducts();
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchProducts = async () => {
    setSearchLoading(true);
    try {
      const res = await api.get(`/billing/search-products?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Error searching products:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle selecting a buyer
  const handleSelectBuyer = (buyer) => {
    setSelectedBuyerId(buyer.id);
    setCustomerName(buyer.name);
    setCustomerPhone(buyer.phone || '');
    setHotelName(buyer.company_name || '');
    setHotelAddress(buyer.address || '');
    setBuyerSearchQuery(buyer.name);
    setShowBuyerDropdown(false);
    setSuccess('Buyer details autofilled!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Add Item to Invoice
  const addItemToInvoice = (product) => {
    const existing = items.find(item => item.productId === product.id);
    if (existing) {
      setItems(items.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        model: product.model || '',
        price: product.sellPrice,
        quantity: 1,
        gst_rate: 18.0, // Default 18% GST snapshot
        total: product.sellPrice
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateItemQty = (index, qty) => {
    const newItems = [...items];
    const item = newItems[index];
    item.quantity = Math.max(1, parseInt(qty) || 1);
    item.total = item.quantity * item.price;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.total, 0);
  const calculateTax = () => calculateSubtotal() * 0.18; // 18% flat CGST/SGST representation
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!hotelName || !customerName || items.length === 0) {
      setError('Please fill in all required fields and add at least one product.');
      return;
    }

    const payload = {
      hotel_name: hotelName,
      hotel_address: hotelAddress,
      customer_name: customerName,
      customer_phone: customerPhone,
      buyer_id: selectedBuyerId || null,
      invoice_date: invoiceDate,
      due_date: dueDate,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      paid_amount: parseFloat(paidAmount) || 0,
      notes: notes,
      items: items
    };

    try {
      const res = await api.post('/hotel-invoices', payload);
      if (res.data && res.data.success) {
        setSuccess('Hotel invoice created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchInvoices();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save hotel invoice.');
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice? Product stocks will be restored.')) return;
    try {
      const res = await api.delete(`/hotel-invoices/${id}`);
      if (res.data && res.data.success) {
        setSuccess('Invoice deleted successfully!');
        fetchInvoices();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete invoice.');
    }
  };

  const resetForm = () => {
    setHotelName('');
    setHotelAddress('');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedBuyerId('');
    setBuyerSearchQuery('');
    setItems([]);
    setPaidAmount(0);
    setPaymentStatus('unpaid');
    setNotes('');
  };

  const handlePrint = (invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product_name} (${item.product_model || '—'})</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
      <head>
        <title>Hotel Invoice - ${invoice.invoice_number}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 30px; color: #333; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; }
          .details { margin: 25px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { border-bottom: 1px solid #000; padding: 10px; text-align: left; }
          .total { text-align: right; margin-top: 20px; font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>AVVA TRADERS</h2>
          <p>Hotel invoice billing snapshot</p>
        </div>
        <div class="details">
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Hotel:</strong> ${invoice.hotel_name}</p>
          <p><strong>Address:</strong> ${invoice.hotel_address || '—'}</p>
          <p><strong>Customer:</strong> ${invoice.customer_name} (${invoice.customer_phone || '—'})</p>
          <p><strong>Invoice Date:</strong> ${invoice.invoice_date}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="total">
          <p>Subtotal: ₹${invoice.subtotal.toFixed(2)}</p>
          <p>Tax (GST 18%): ₹${(invoice.cgst_total + invoice.sgst_total + invoice.igst_total).toFixed(2)}</p>
          <p style="font-size: 20px; border-top: 1px dashed #000; padding-top: 8px;">Grand Total: ₹${invoice.total.toFixed(2)}</p>
          <p>Outstanding: ₹${(invoice.total - invoice.paid_amount).toFixed(2)}</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredBuyers = buyersList.filter(b => 
    b.name.toLowerCase().includes(buyerSearchQuery.toLowerCase()) ||
    (b.company_name && b.company_name.toLowerCase().includes(buyerSearchQuery.toLowerCase())) ||
    (b.phone && b.phone.includes(buyerSearchQuery))
  );

  return (
    <div style={{ padding: '30px 40px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      {/* Toast Messages */}
      {success && <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '8px', color: '#a7f3d0', marginBottom: '20px' }}>{success}</div>}
      {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px' }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', background: 'linear-gradient(to right, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>🏨 Hotel Invoices</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '14px' }}>Create and manage hotel-wise invoices</p>
        </div>
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', border: 'none', backgroundColor: '#2563eb', color: '#fff' }}
          onClick={() => { resetForm(); setShowCreateModal(true); }}
        >
          <Plus size={16} /> Create Hotel Invoice
        </button>
      </div>

      {/* Invoice list */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading hotel invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No hotel invoices found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#334155', color: '#cbd5e1', textTransform: 'uppercase', fontSize: '12px' }}>
                <th style={{ padding: '14px 18px' }}>Invoice No</th>
                <th style={{ padding: '14px 18px' }}>Hotel Name</th>
                <th style={{ padding: '14px 18px' }}>Customer</th>
                <th style={{ padding: '14px 18px' }}>Date</th>
                <th style={{ padding: '14px 18px' }}>Total Amount</th>
                <th style={{ padding: '14px 18px' }}>Outstanding</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid #334155' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 'bold' }}>{inv.invoice_number}</td>
                  <td style={{ padding: '14px 18px' }}>{inv.hotel_name}</td>
                  <td style={{ padding: '14px 18px' }}>{inv.customer_name}</td>
                  <td style={{ padding: '14px 18px' }}>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 'bold' }}>₹{inv.total.toFixed(2)}</td>
                  <td style={{ padding: '14px 18px', color: (inv.total - inv.paid_amount) > 0 ? '#f87171' : '#4ade80' }}>
                    ₹{(inv.total - inv.paid_amount).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '10px', backgroundColor: inv.payment_status === 'paid' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: inv.payment_status === 'paid' ? '#10b981' : '#ef4444' }}>
                      {inv.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => { setViewingInvoice(inv); setShowViewModal(true); }}
                        style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                        title="View details"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => handlePrint(inv)}
                        style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer' }}
                        title="Print invoice"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteInvoice(inv.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Details Modal */}
      {showViewModal && viewingInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowViewModal(false)}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '90%', maxWidth: '700px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>📄 Invoice Details: {viewingInvoice.invoice_number}</h2>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '14px' }}>
              <div><strong>Hotel Name:</strong> {viewingInvoice.hotel_name}</div>
              <div><strong>Customer Name:</strong> {viewingInvoice.customer_name}</div>
              <div><strong>Hotel Address:</strong> {viewingInvoice.hotel_address || '—'}</div>
              <div><strong>Customer Phone:</strong> {viewingInvoice.customer_phone || '—'}</div>
              <div><strong>Invoice Date:</strong> {viewingInvoice.invoice_date}</div>
              <div><strong>Due Date:</strong> {viewingInvoice.due_date}</div>
              <div><strong>Payment Method:</strong> {viewingInvoice.payment_method}</div>
              <div><strong>Payment Status:</strong> {viewingInvoice.payment_status}</div>
            </div>

            <h4 style={{ margin: '15px 0 8px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>Items Summary</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#334155', color: '#cbd5e1' }}>
                    <th style={{ padding: '8px' }}>Product</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '8px' }}>{it.product_name} ({it.product_model || '—'})</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₹{it.price.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₹{it.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 'bold' }}>
              <p>Subtotal: ₹{viewingInvoice.subtotal.toFixed(2)}</p>
              <p style={{ fontSize: '18px', color: '#38bdf8' }}>Grand Total (incl. GST): ₹{viewingInvoice.total.toFixed(2)}</p>
              <p style={{ color: '#f87171' }}>Paid: ₹{viewingInvoice.paid_amount.toFixed(2)} | Outstanding: ₹{(viewingInvoice.total - viewingInvoice.paid_amount).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '90%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>🏨 Create New Hotel Invoice</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveInvoice}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                
                {/* Buyer Autocomplete Search */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Search Registered Buyer</label>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                    <input 
                      type="text" 
                      placeholder="Type name, phone or company..."
                      value={buyerSearchQuery}
                      onChange={(e) => { setBuyerSearchQuery(e.target.value); setShowBuyerDropdown(true); }}
                      onFocus={() => setShowBuyerDropdown(true)}
                      style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 10px 10px 35px', borderRadius: '8px', outline: 'none', width: '100%', fontSize: '14px' }}
                    />
                  </div>
                  {showBuyerDropdown && buyerSearchQuery && (
                    <div style={{ position: 'absolute', top: '65px', left: 0, right: 0, backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
                      {filteredBuyers.length === 0 ? (
                        <div style={{ padding: '10px', color: '#64748b', fontSize: '13px' }}>No registered buyers found.</div>
                      ) : (
                        filteredBuyers.map(b => (
                          <div 
                            key={b.id} 
                            onClick={() => handleSelectBuyer(b)}
                            style={{ padding: '10px 14px', borderBottom: '1px solid #334155', cursor: 'pointer', hover: { backgroundColor: '#334155' } }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{b.name}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{b.company_name} | {b.phone}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Hotel Name *</label>
                  <input type="text" value={hotelName} onChange={e => setHotelName(e.target.value)} required style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontSize: '14px' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Customer Name *</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Customer Phone</label>
                  <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Invoice Date</label>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8' }}>Hotel Address</label>
                <textarea value={hotelAddress} onChange={e => setHotelAddress(e.target.value)} style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontSize: '14px', height: '60px' }} />
              </div>

              {/* Product Autocomplete Lookup */}
              <h4 style={{ margin: '20px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '6px', color: '#60a5fa' }}>🛍️ Add Products</h4>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <input 
                    type="text" 
                    placeholder="Search product name or model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '10px 10px 10px 35px', borderRadius: '8px', outline: 'none', width: '100%', fontSize: '14px' }}
                  />
                </div>
                {searchLoading && <div style={{ position: 'absolute', right: '15px', top: '12px', fontSize: '12px', color: '#94a3b8' }}>Searching...</div>}
                {searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '45px', left: 0, right: 0, backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResults.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => addItemToInvoice(p)}
                        style={{ padding: '10px 14px', borderBottom: '1px solid #334155', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div>
                          <strong>{p.name}</strong> ({p.model || '—'})
                        </div>
                        <div style={{ color: '#38bdf8' }}>₹{p.sellPrice} | Qty: {p.quantity}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#334155', color: '#cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontStyle: 'italic' }}>No items added to invoice yet.</td></tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '8px' }}>{item.name} ({item.model || '—'})</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.quantity} 
                            onChange={e => updateItemQty(idx, e.target.value)}
                            style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', padding: '4px', width: '60px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₹{item.total.toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Payments Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', backgroundColor: '#0f172a', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #475569', padding: '10px', borderRadius: '8px' }}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>Paid Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={paidAmount} 
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setPaidAmount(val);
                      const total = calculateTotal();
                      if (val >= total) setPaymentStatus('paid');
                      else if (val > 0) setPaymentStatus('partial');
                      else setPaymentStatus('unpaid');
                    }} 
                    style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #475569', padding: '10px', borderRadius: '8px', outline: 'none' }} 
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 'bold', marginBottom: '20px' }}>
                <p>Subtotal: ₹{calculateSubtotal().toFixed(2)}</p>
                <p>Tax (18% GST representation): ₹{calculateTax().toFixed(2)}</p>
                <p style={{ fontSize: '20px', color: '#38bdf8' }}>Grand Total: ₹{calculateTotal().toFixed(2)}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', border: 'none', backgroundColor: '#475569', color: '#fff' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', border: 'none', backgroundColor: '#2563eb', color: '#fff' }}><Save size={14} /> Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelInvoicePage;
