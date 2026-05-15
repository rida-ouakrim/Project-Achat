import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, ShoppingCart, BarChart3, BookOpen } from 'lucide-react';

const Sidebar = () => {
  const userRole = localStorage.getItem('userRole');

  return (
    <aside className="sidebar" style={{
      width: '250px',
      backgroundColor: 'var(--color-sidebar)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
        <img 
          src="/logo.png" 
          alt="MAN Logo" 
          style={{ height: '45px', objectFit: 'contain' }} 
        />
      </div>
      
      <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>Rôles</p>
        
        {userRole === 'requester' && (
          <NavLink to="/requester" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
            borderRadius: 'var(--radius-md)', textDecoration: 'none',
            backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
            fontWeight: isActive ? 600 : 500,
            transition: 'var(--transition)'
          })}>
            <User size={20} />
            Demandeur
          </NavLink>
        )}

        {userRole === 'purchasing' && (
          <NavLink to="/purchasing" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
            borderRadius: 'var(--radius-md)', textDecoration: 'none',
            backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
            fontWeight: isActive ? 600 : 500,
            transition: 'var(--transition)'
          })}>
            <ShoppingCart size={20} />
            Équipe Achats
          </NavLink>
        )}

        {userRole === 'director' && (
          <NavLink to="/director" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
            borderRadius: 'var(--radius-md)', textDecoration: 'none',
            backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
            fontWeight: isActive ? 600 : 500,
            transition: 'var(--transition)'
          })}>
            <BarChart3 size={20} />
            Directeur (DG)
          </NavLink>
        )}

        {(userRole === 'purchasing' || userRole === 'director') && (
          <>
            <div style={{ margin: '1rem 0 0.25rem 0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Référentiels
            </div>
            <NavLink to="/suppliers" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              borderRadius: 'var(--radius-md)', textDecoration: 'none',
              backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
              fontWeight: isActive ? 600 : 500,
              transition: 'var(--transition)'
            })}>
              <BookOpen size={20} />
              Fournisseurs
            </NavLink>
          </>
        )}

        {(userRole === 'purchasing' || userRole === 'director') && (
          <>
            <div style={{ margin: '1rem 0 0.25rem 0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Outils IA
            </div>
            <NavLink to="/sourcing" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              borderRadius: 'var(--radius-md)', textDecoration: 'none',
              backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
              fontWeight: isActive ? 600 : 500,
              transition: 'var(--transition)'
            })}>
              <span style={{ fontSize: '1.2rem' }}>🔍</span>
              Sourcing (Recherche)
            </NavLink>
            <NavLink to="/compare-quotes" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              borderRadius: 'var(--radius-md)', textDecoration: 'none',
              backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
              fontWeight: isActive ? 600 : 500,
              transition: 'var(--transition)'
            })}>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
              Comparaison Devis
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
