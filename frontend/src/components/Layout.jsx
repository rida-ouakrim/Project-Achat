import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FloatingChat from './FloatingChat';

const Layout = () => {
  const userRole = localStorage.getItem('userRole');
  const userName = (localStorage.getItem('userName') || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userName === 'rouakrim@sefamar.ma';
  const location = useLocation();

  if (!userRole && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  // Restriction des routes par rôle (RBAC)
  const path = location.pathname.replace('/', '');
  
  const allPaths = ['admin-dashboard', 'director', 'purchasing', 'requester', 'validation', 'suppliers', 'sourcing', 'compare-quotes'];

  const roleRouteMap = {
    admin: allPaths,
    director: ['director', 'requester', 'validation', 'suppliers', 'sourcing', 'compare-quotes'],
    purchasing: ['purchasing', 'suppliers', 'sourcing', 'compare-quotes'],
    requester: ['chadi@sefamar.ma', 'g.benelhassane@sefamar.ma', 'man@sefamar.ma'].includes(userName) ? ['requester', 'validation'] : ['requester'],
    validator: ['validation'],
    ai_tools: ['sourcing', 'compare-quotes']
  };

  const allowedPaths = isAdmin ? allPaths : (roleRouteMap[userRole] || ['sourcing']);
  if (path && !allowedPaths.includes(path)) {
    return <Navigate to={allowedPaths[0] ? `/${allowedPaths[0]}` : '/sourcing'} replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      {/* Injecter le Chatbot intelligent pour l'Admin, le Directeur, l'Équipe Achats et Outils IA */}
      {(isAdmin || userRole === 'director' || userRole === 'purchasing' || userRole === 'ai_tools') && <FloatingChat />}
    </div>
  );
};

export default Layout;
