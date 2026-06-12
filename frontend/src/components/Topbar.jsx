import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, UserCircle, LogOut, Check } from 'lucide-react';
import { fetchNotifications, markAllNotificationsRead } from '../api';
import toast from 'react-hot-toast';

const Topbar = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const userRole = localStorage.getItem('userRole');

  const loadNotifications = async () => {
    if (!userId) return;
    try {
      const response = await fetchNotifications(userId);
      setNotifications(response.data);
    } catch (err) {
      console.error("Erreur de chargement des notifications:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll notifications every 8 seconds for real-time notifications
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, [userId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(userId);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success("Toutes les notifications ont été marquées comme lues.");
    } catch (err) {
      console.error(err);
      toast.error("Impossible de marquer les notifications comme lues.");
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      borderTop: '3px solid var(--color-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'relative',
      zIndex: 10
    }}>
      <div></div> {/* Spacer */}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--color-text-muted)' }}>
        
        {/* Notification Bell with Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'inherit',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '50%',
              transition: 'background-color 0.2s',
              backgroundColor: isOpen ? '#f1f5f9' : 'transparent'
            }}
            title="Notifications"
          >
            <Bell size={20} style={{ color: unreadCount > 0 ? 'var(--color-primary)' : 'inherit' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px #ffffff'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '45px',
              right: '0',
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {/* Dropdown Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: '#f8fafc'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.875rem' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Check size={12} /> Tout lire
                  </button>
                )}
              </div>

              {/* Dropdown List */}
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.8125rem'
                  }}>
                    Aucune notification
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: notif.is_read ? 'transparent' : '#f0fdf4',
                        transition: 'background-color 0.2s',
                        cursor: 'default'
                      }}
                    >
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.8125rem', 
                        color: 'var(--color-text-main)', 
                        lineHeight: '1.25',
                        fontWeight: notif.is_read ? 'normal' : '500' 
                      }}>
                        {notif.message}
                      </p>
                      <span style={{ 
                        fontSize: '0.6875rem', 
                        color: '#94a3b8', 
                        marginTop: '0.25rem', 
                        display: 'block' 
                      }}>
                        {new Date(notif.created_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCircle size={32} style={{ color: 'var(--color-primary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              {userName || 'Utilisateur'}
            </span>
            <span style={{ fontSize: '0.75rem' }}>
              {userName === 'chadi@sefamar.ma' ? 'Validateur Spécial' :
               userRole === 'requester' ? 'Demandeur' : 
               userRole === 'purchasing' ? 'Équipe Achats' : 'Directeur (DG)'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => {
            localStorage.clear();
            navigate('/login');
          }}
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
