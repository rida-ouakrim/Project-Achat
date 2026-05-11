import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, UserCircle, LogOut } from 'lucide-react';

const Topbar = () => {
  const navigate = useNavigate();

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem'
    }}>
      <div></div> {/* Spacer */}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--color-text-muted)' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCircle size={32} style={{ color: 'var(--color-primary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              {localStorage.getItem('userName') || 'Utilisateur'}
            </span>
            <span style={{ fontSize: '0.75rem' }}>
              {localStorage.getItem('userRole') === 'requester' ? 'Demandeur' : 
               localStorage.getItem('userRole') === 'purchasing' ? 'Équipe Achats' : 'Directeur (DG)'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}
          title="Déconnexion"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
