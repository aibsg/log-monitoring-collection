import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, BarChart3 } from 'lucide-react';

const Header = () => {
  const location = useLocation();

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="header-title">
            <FileText size={24} style={{ marginRight: '0.5rem' }} />
            Invoice Management
          </Link>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link 
              to="/invoices" 
              className={`btn ${location.pathname === '/' || location.pathname === '/invoices' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <FileText size={16} />
              Invoices
            </Link>
            <Link 
              to="/stats" 
              className={`btn ${location.pathname === '/stats' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <BarChart3 size={16} />
              Statistics
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;


