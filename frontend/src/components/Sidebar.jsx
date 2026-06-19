import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, ShoppingCart, BarChart3, BookOpen, CheckSquare } from 'lucide-react';

const Sidebar = () => {
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');

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
        <p className="sidebar-section-title">Rôles</p>
        
        {(userRole === 'requester' || userRole === 'director') && (
          <NavLink to="/requester" className={({ isActive }) => `sidebar-link ${isActive ? 'active-demandeur' : ''}`}>
            <User size={18} />
            Demandeur
          </NavLink>
        )}

        {userRole === 'purchasing' && (
          <NavLink to="/purchasing" className={({ isActive }) => `sidebar-link ${isActive ? 'active-purchasing' : ''}`}>
            <ShoppingCart size={18} />
            Équipe Achats
          </NavLink>
        )}

        {userRole === 'director' && (
          <NavLink to="/director" className={({ isActive }) => `sidebar-link ${isActive ? 'active-directeur' : ''}`}>
            <BarChart3 size={18} />
            Tableau de bord
          </NavLink>
        )}

        {(userRole === 'director' || ['chadi@sefamar.ma', 'g.benelhassane@sefamar.ma'].includes(userName)) && (
          <NavLink to="/validation" className={({ isActive }) => `sidebar-link ${isActive ? 'active-validation' : ''}`}>
            <CheckSquare size={18} />
            Validation
          </NavLink>
        )}

        {(userRole === 'purchasing' || userRole === 'director') && (
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

        {(userRole === 'purchasing' || userRole === 'director') && (
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
