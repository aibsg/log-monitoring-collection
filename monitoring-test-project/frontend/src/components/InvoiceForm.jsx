import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { invoiceAPI } from '../services/api';

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientName: '',
    clientEmail: '',
    amount: '',
    currency: 'USD',
    status: 'draft',
    dueDate: '',
    description: ''
  });

  const [errors, setErrors] = useState({});

  // Fetch invoice data for editing
  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery(
    ['invoice', id],
    () => invoiceAPI.getInvoice(id),
    {
      enabled: isEdit,
      onSuccess: (data) => {
        const invoice = data.data.data;
        setFormData({
          invoiceNumber: invoice.invoice_number || '',
          clientName: invoice.client_name || '',
          clientEmail: invoice.client_email || '',
          amount: invoice.amount || '',
          currency: invoice.currency || 'USD',
          status: invoice.status || 'draft',
          dueDate: invoice.due_date ? invoice.due_date.split('T')[0] : '',
          description: invoice.description || ''
        });
      }
    }
  );

  // Create/Update mutation
  const mutation = useMutation(
    (data) => isEdit ? invoiceAPI.updateInvoice(id, data) : invoiceAPI.createInvoice(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        navigate('/invoices');
      },
      onError: (error) => {
        if (error.response?.data?.details) {
          setErrors(error.response.data.details.reduce((acc, err) => {
            acc[err.path] = err.message;
            return acc;
          }, {}));
        } else {
          setErrors({ general: error.response?.data?.error || 'An error occurred' });
        }
      }
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = 'Client email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    mutation.mutate(formData);
  };

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `INV-${year}${month}${day}-${random}`;
  };

  const handleGenerateInvoiceNumber = () => {
    setFormData(prev => ({
      ...prev,
      invoiceNumber: generateInvoiceNumber()
    }));
  };

  if (isEdit && isLoadingInvoice) {
    return <div className="loading">Loading invoice...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/invoices')}
          className="btn btn-secondary"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1>{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
      </div>

      {errors.general && (
        <div className="error">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Invoice Number */}
          <div className="form-group">
            <label className="form-label">
              Invoice Number *
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleGenerateInvoiceNumber}
                  style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  className="btn btn-secondary"
                >
                  Generate
                </button>
              )}
            </label>
            <input
              type="text"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleInputChange}
              className={`form-input ${errors.invoiceNumber ? 'error' : ''}`}
              placeholder="e.g., INV-20240101-001"
              disabled={isEdit}
            />
            {errors.invoiceNumber && <div className="error" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.invoiceNumber}</div>}
          </div>

          {/* Client Name */}
          <div className="form-group">
            <label className="form-label">Client Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              className={`form-input ${errors.clientName ? 'error' : ''}`}
              placeholder="Enter client name"
            />
            {errors.clientName && <div className="error" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.clientName}</div>}
          </div>

          {/* Client Email */}
          <div className="form-group">
            <label className="form-label">Client Email *</label>
            <input
              type="email"
              name="clientEmail"
              value={formData.clientEmail}
              onChange={handleInputChange}
              className={`form-input ${errors.clientEmail ? 'error' : ''}`}
              placeholder="client@example.com"
            />
            {errors.clientEmail && <div className="error" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.clientEmail}</div>}
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Amount *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className={`form-input ${errors.amount ? 'error' : ''}`}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.amount && <div className="error" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.amount}</div>}
          </div>

          {/* Currency */}
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="RUB">RUB</option>
              <option value="UAH">UAH</option>
            </select>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className={`form-input ${errors.dueDate ? 'error' : ''}`}
            />
            {errors.dueDate && <div className="error" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.dueDate}</div>}
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="Enter invoice description or notes..."
            rows="4"
          />
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isLoading}
          >
            <Save size={16} />
            {mutation.isLoading ? 'Saving...' : (isEdit ? 'Update Invoice' : 'Create Invoice')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;


