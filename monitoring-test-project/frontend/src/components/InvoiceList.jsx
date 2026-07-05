import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { invoiceAPI } from '../services/api';
import { parseISO, format } from "date-fns";

const InvoiceList = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 10
  });

  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoicesData, isLoading, error } = useQuery(
    ['invoices', filters],
    () => invoiceAPI.getInvoices(filters),
    {
      keepPreviousData: true
    }
  );

  // Delete invoice mutation
  const deleteMutation = useMutation(
    (id) => invoiceAPI.deleteInvoice(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
      }
    }
  );

  const handleDelete = (id, invoiceNumber) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      sent: 'status-sent',
      paid: 'status-paid',
      overdue: 'status-overdue',
      cancelled: 'status-cancelled'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-draft'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return <div className="loading">Loading invoices...</div>;
  }

  if (error) {
    return <div className="error">Error loading invoices: {error.message}</div>;
  }

  const { data: invoices, pagination } = invoicesData?.data || { data: [], pagination: {} };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Invoices</h1>
        <Link to="/invoices/new" className="btn btn-primary">
          <Plus size={16} />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by client name or invoice number..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Items per page</label>
            <select
              className="form-select"
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No invoices found. <Link to="/invoices/new">Create your first invoice</Link>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoice_number}</strong>
                    </td>
                    <td>{invoice.client_name}</td>
                    <td>{invoice.client_email}</td>
                    <td>
                      {invoice.currency} {parseFloat(invoice.amount).toFixed(2)}
                    </td>
                    <td>{getStatusBadge(invoice.status)}</td>
                    <td>{invoice.dueDate ? format(parseISO(invoice.dueDate), 'dd.MM.yyyy') : '—'}</td>
                    <td>{invoice.dueDate ? format(parseISO(invoice.dueDate), 'dd.MM.yyyy') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link
                          to={`/invoices/${invoice.id}/edit`}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Edit size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          disabled={deleteMutation.isLoading}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  Previous
                </button>
                
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={page === pagination.currentPage ? 'active' : ''}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            )}

            {/* Pagination Info */}
            {pagination && (
              <div style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} invoices
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;


