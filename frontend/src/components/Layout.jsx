import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FloatingChat from './FloatingChat';

const Layout = () => {
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Restriction stricte des routes (Autorise le rôle courant OU la page suppliers partagée)
  const path = location.pathname.replace('/', '');
  const allowedPaths = [userRole, 'suppliers', 'sourcing', 'compare-quotes'];
  if (path && !allowedPaths.includes(path)) {
    return <Navigate to={`/${userRole}`} replace />;
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
      {/* Injecter le Chatbot intelligent pour le Directeur et l'Équipe Achats */}
      {(userRole === 'director' || userRole === 'purchasing') && <FloatingChat />}
    </div>
  );
};

export default Layout;
