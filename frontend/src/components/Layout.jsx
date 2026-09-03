import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FloatingChat from './FloatingChat';

const Layout = () => {
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');
  const location = useLocation();

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Restriction stricte des routes par rôle (RBAC)
  const path = location.pathname.replace('/', '');
  
  const roleRouteMap = {
    requester: ['chadi@sefamar.ma', 'g.benelhassane@sefamar.ma'].includes(userName) ? ['requester', 'validation'] : ['requester'],
    purchasing: ['purchasing', 'suppliers', 'sourcing', 'compare-quotes'],
    director: ['director', 'requester', 'validation', 'suppliers', 'sourcing', 'compare-quotes'],
    ai_tools: ['sourcing', 'compare-quotes']
  };

  const allowedPaths = roleRouteMap[userRole] || ['sourcing'];
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
      {/* Injecter le Chatbot intelligent pour le Directeur, l'Équipe Achats et Outils IA */}
      {(userRole === 'director' || userRole === 'purchasing' || userRole === 'ai_tools') && <FloatingChat />}
    </div>
  );
};

export default Layout;
