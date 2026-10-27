import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, Users, ShoppingCart, BarChart3, BookOpen, CheckSquare, Shield } from 'lucide-react';

const Sidebar = () => {
  const userRole = localStorage.getItem('userRole');
  const userName = (localStorage.getItem('userName') || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userName === 'rouakrim@sefamar.ma';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src="/logo.png"
          alt="MAN Logo"
          style={{ height: '40px', objectFit: 'contain' }}
        />
      </div>

      <nav className="sidebar-nav">
        {isAdmin && (
          <>
            <p className="sidebar-section-title" style={{ color: '#ef4444', fontWeight: 'bold' }}>ADMINISTRATION</p>
            <NavLink to="/admin-dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active-admin' : ''}`} style={({ isActive }) => isActive ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 } : { color: '#f87171' }}>
              <Shield size={18} />
              Superviseur Admin
            </NavLink>
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active-admin' : ''}`} style={({ isActive }) => isActive ? { backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', fontWeight: 600 } : { color: '#2563eb' }}>
              <Users size={18} />
              Gestion Utilisateurs
            </NavLink>
            <div className="sidebar-section-divider">Espaces Métiers</div>
          </>
        )}

        {!isAdmin && <p className="sidebar-section-title">Rôles</p>}

        {(isAdmin || userRole === 'requester' || userRole === 'director') && (
          <NavLink to="/requester" className={({ isActive }) => `sidebar-link ${isActive ? 'active-demandeur' : ''}`}>
            <User size={18} />
            Demandeur
          </NavLink>
        )}

        {(isAdmin || userRole === 'purchasing') && (
          <NavLink to="/purchasing" className={({ isActive }) => `sidebar-link ${isActive ? 'active-purchasing' : ''}`}>
            <ShoppingCart size={18} />
            Équipe Achats
          </NavLink>
        )}

        {(isAdmin || userRole === 'director') && (
          <NavLink to="/director" className={({ isActive }) => `sidebar-link ${isActive ? 'active-directeur' : ''}`}>
            <BarChart3 size={18} />
            Tableau de bord
          </NavLink>
        )}

        {(isAdmin || userRole === 'director' || ['chadi@sefamar.ma', 'g.benelhassane@sefamar.ma', 'man@sefamar.ma'].includes(userName)) && (
          <NavLink to="/validation" className={({ isActive }) => `sidebar-link ${isActive ? 'active-validation' : ''}`}>
            <CheckSquare size={18} />
            Validation
          </NavLink>
        )}

        {(isAdmin || userRole === 'purchasing' || userRole === 'director') && (
          <>
            <div className="sidebar-section-divider">
              Référentiels
            </div>
            <NavLink to="/suppliers" className={({ isActive }) => `sidebar-link ${isActive ? 'active-suppliers' : ''}`}>
              <BookOpen size={18} />
              Fournisseurs
            </NavLink>
          </>
        )}

        {(isAdmin || userRole === 'purchasing' || userRole === 'director' || userRole === 'ai_tools') && (
          <>
            <div className="sidebar-section-divider">
              Outils IA
            </div>
            <NavLink to="/sourcing" className={({ isActive }) => `sidebar-link ${isActive ? 'active-sourcing' : ''}`}>
              <span style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>🔍</span>
              Sourcing (Recherche)
            </NavLink>
            <NavLink to="/compare-quotes" className={({ isActive }) => `sidebar-link ${isActive ? 'active-compare' : ''}`}>
              <span style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>📊</span>
              Comparaison Devis
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
