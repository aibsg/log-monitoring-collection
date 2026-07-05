import React from 'react';
import { useQuery } from 'react-query';
import { DollarSign, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { invoiceAPI } from '../services/api';

const Stats = () => {
  const { data: statsData, isLoading, error } = useQuery(
    'stats',
    () => invoiceAPI.getStats(),
    {
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  );

  if (isLoading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (error) {
    return <div className="error">Error loading statistics: {error.message}</div>;
  }

  const stats = statsData?.data?.data || {};

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6b7280',
      sent: '#3b82f6',
      paid: '#10b981',
      overdue: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={20} />;
      case 'overdue':
        return <AlertTriangle size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Statistics</h1>

      {/* Main Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FileText size={24} color="#3b82f6" />
            <span className="stat-label">Total Invoices</span>
          </div>
          <div className="stat-value">{stats.totalInvoices || 0}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={24} color="#10b981" />
            <span className="stat-label">Total Paid Amount</span>
          </div>
          <div className="stat-value">${(stats.totalPaidAmount || 0).toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={24} color="#ef4444" />
            <span className="stat-label">Overdue Invoices</span>
          </div>
          <div className="stat-value">{stats.overdueCount || 0}</div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Invoices by Status</h2>
        
        {stats.statusCounts && Object.keys(stats.statusCounts).length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <div
                key={status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ color: getStatusColor(status) }}>
                    {getStatusIcon(status)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                      {status}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {count} invoice{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: getStatusColor(status) }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No invoices found
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.location.href = '/invoices/new'}
            className="btn btn-primary"
          >
            <FileText size={16} />
            Create New Invoice
          </button>
          <button
            onClick={() => window.location.href = '/invoices?status=draft'}
            className="btn btn-secondary"
          >
            View Draft Invoices
          </button>
          <button
            onClick={() => window.location.href = '/invoices?status=overdue'}
            className="btn btn-danger"
          >
            View Overdue Invoices
          </button>
        </div>
      </div>

      {/* Recent Activity (placeholder) */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Recent activity tracking will be implemented in future updates
        </div>
      </div>
    </div>
  );
};

export default Stats;


