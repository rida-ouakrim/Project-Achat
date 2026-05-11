import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import RequesterDashboard from './pages/RequesterDashboard';
import PurchasingDashboard from './pages/PurchasingDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import SuppliersPage from './pages/SuppliersPage';

function App() {
  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="requester" element={<RequesterDashboard />} />
          <Route path="purchasing" element={<PurchasingDashboard />} />
          <Route path="director" element={<DirectorDashboard />} />
          <Route path="suppliers" element={<SuppliersPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
