import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Restriction stricte des routes (Autorise le rôle courant OU la page suppliers partagée)
  const path = location.pathname.replace('/', '');
  const allowedPaths = [userRole, 'suppliers'];
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
    </div>
  );
};

export default Layout;
