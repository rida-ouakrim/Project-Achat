import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Shield, Users, FileText, BookOpen, TrendingUp, Clock, CheckCircle, 
  XCircle, ShoppingCart, RefreshCw, Search, Plus, Trash2, Key, Eye, 
  Download, ExternalLink, ChevronLeft, ChevronRight, Filter, AlertCircle,
  UserCheck, ShieldCheck, Check, Sparkles, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  fetchRequests, fetchUsers, createUser, updateUserRoleValidator, 
  deleteUser, resetUserPassword, fetchCatalog, createCatalog, deleteCatalog 
} from '../api';

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendBase = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
  return backendBase + path;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'requests', 'catalog'
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);

  // Users filter & modals
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('Tous');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('requester');
  const [newUserValidator, setNewUserValidator] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  // Password reset modal
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [selectedUserToReset, setSelectedUserToReset] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resettingPass, setResettingPass] = useState(false);

  // Requests table filters & pagination
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('Tous');
  const [reqRequesterFilter, setReqRequesterFilter] = useState('Tous');
  const [reqCurrentPage, setReqCurrentPage] = useState(1);
  const reqItemsPerPage = 10;

  // Request details modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Catalog tab states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isAddCatalogOpen, setIsAddCatalogOpen] = useState(false);
  const [newCatProduct, setNewCatProduct] = useState('');
  const [newCatSupplier, setNewCatSupplier] = useState('');
  const [newCatPrice, setNewCatPrice] = useState('');
  const [newCatUnit, setNewCatUnit] = useState('U');
  const [addingCatalog, setAddingCatalog] = useState(false);

  // Load all initial data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [reqRes, usersRes, catRes] = await Promise.all([
        fetchRequests(),
        fetchUsers(),
        fetchCatalog()
      ]);
      setRequests(reqRes.data || []);
      setUsers(usersRes.data || []);
      setCatalogItems(catRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des données globales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Potential validators list (users with role 'validator', 'director', or 'admin')
  const potentialValidators = users.filter(u => {
    const role = u.profile?.role;
    return role === 'validator' || role === 'director' || role === 'admin' ||
      ['man@sefamar.ma', 'chadi@sefamar.ma', 'g.benelhassane@sefamar.ma', 'rouakrim@sefamar.ma'].includes(u.username);
  });

  // Handler: Change Assigned Validator dynamically
  const handleAssignValidator = async (userId, newValidatorId) => {
    try {
      const payload = {
        validator_id: newValidatorId ? parseInt(newValidatorId) : null
      };
      await updateUserRoleValidator(userId, payload);
      toast.success("Affectation du validateur mise à jour !");
      // Update local state smoothly
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          const matchedVal = potentialValidators.find(v => v.id === parseInt(newValidatorId));
          return {
            ...u,
            profile: {
              ...u.profile,
              validator: matchedVal ? { id: matchedVal.id, username: matchedVal.username } : null,
              validator_id: matchedVal ? matchedVal.id : null,
              validator_name: matchedVal ? matchedVal.username : null
            }
          };
        }
        return u;
      }));
    } catch (err) {
      console.error(err);
      toast.error("Échec de la modification du validateur.");
    }
  };

  // Handler: Change Role dynamically
  const handleChangeRole = async (userId, newRole) => {
    try {
      await updateUserRoleValidator(userId, { role: newRole });
      toast.success("Rôle utilisateur mis à jour !");
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            profile: {
              ...u.profile,
              role: newRole
            }
          };
        }
        return u;
      }));
    } catch (err) {
      console.error(err);
      toast.error("Échec de la mise à jour du rôle.");
    }
  };

  // Handler: Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) {
      toast.error("Veuillez remplir l'email et le mot de passe.");
      return;
    }
    setAddingUser(true);
    try {
      const payload = {
        username: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        validator_id: newUserValidator ? parseInt(newUserValidator) : null
      };
      const res = await createUser(payload);
      toast.success(`Compte ${newUserEmail} créé avec succès !`);
      setUsers(prev => [res.data, ...prev]);
      setIsAddUserOpen(false);
      setNewUserEmail('');
      setNewPasswordVal('');
      setNewUserValidator('');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Erreur lors de la création de l'utilisateur.";
      toast.error(errMsg);
    } finally {
      setAddingUser(false);
    }
  };

  // Handler: Delete User
  const handleDeleteUser = async (userId, username) => {
    if (['rouakrim@sefamar.ma', 'man@sefamar.ma', 'achat@sefamar.ma'].includes(username)) {
      toast.error("Impossible de supprimer un compte système maître !");
      return;
    }
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${username} ?`)) {
      return;
    }
    try {
      await deleteUser(userId);
      toast.success(`Utilisateur ${username} supprimé.`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      toast.error("Échec de la suppression de l'utilisateur.");
    }
  };

  // Handler: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordVal) {
      toast.error("Le nouveau mot de passe est obligatoire.");
      return;
    }
    setResettingPass(true);
    try {
      await resetUserPassword(selectedUserToReset.id, newPasswordVal);
      toast.success(`Mot de passe réinitialisé pour ${selectedUserToReset.username} !`);
      setIsResetPassOpen(false);
      setSelectedUserToReset(null);
      setNewPasswordVal('');
    } catch (err) {
      console.error(err);
      toast.error("Échec de la réinitialisation du mot de passe.");
    } finally {
      setResettingPass(false);
    }
  };

  // Handler: Add Catalog Item
  const handleAddCatalogItem = async (e) => {
    e.preventDefault();
    if (!newCatProduct || !newCatSupplier || !newCatPrice) {
      toast.error("Veuillez renseigner les champs obligatoires.");
      return;
    }
    setAddingCatalog(true);
    try {
      const res = await createCatalog({
        product_name: newCatProduct.trim(),
        supplier: newCatSupplier.trim(),
        price: `${newCatPrice} DH`,
        unit: newCatUnit || 'U'
      });
      toast.success("Article ajouté au catalogue !");
      setCatalogItems(prev => [res.data, ...prev]);
      setIsAddCatalogOpen(false);
      setNewCatProduct('');
      setNewCatSupplier('');
      setNewCatPrice('');
    } catch (err) {
      console.error(err);
      toast.error("Erreur d'ajout au catalogue.");
    } finally {
      setAddingCatalog(false);
    }
  };

  // Handler: Delete Catalog Item
  const handleDeleteCatalogItem = async (id) => {
    if (!window.confirm("Supprimer cet article du catalogue ?")) return;
    try {
      await deleteCatalog(id);
      toast.success("Article supprimé.");
      setCatalogItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Échec de suppression.");
    }
  };

  // Analytics & KPIs
  const totalRequestsCount = requests.length;
  const pendingRequestsCount = requests.filter(r => r.status === 'En attente' || !r.is_validated).length;
  const validatedRequestsCount = requests.filter(r => r.is_validated).length;
  const orderedRequestsCount = requests.filter(r => r.status === 'Commandé').length;
  const receivedRequestsCount = requests.filter(r => r.status === 'Reçu').length;
  const refusedRequestsCount = requests.filter(r => r.status === 'Refusé').length;

  const totalSpend = requests.reduce((acc, req) => {
    if (req.items && (req.status === 'Commandé' || req.status === 'Reçu')) {
      const sum = req.items.reduce((itemSum, it) => {
        const p = parseFloat((it.price || '').replace(/[^0-9.]/g, '')) || 0;
        const q = parseInt(it.qty, 10) || 1;
        return itemSum + (p * q);
      }, 0);
      return acc + sum;
    }
    return acc;
  }, 0);

  // Requests by Month for BarChart
  const getMonthlyData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const counts = Array(12).fill(0);
    requests.forEach(r => {
      if (r.date_created) {
        const m = new Date(r.date_created).getMonth();
        if (m >= 0 && m < 12) counts[m] += 1;
      }
    });
    const curMonth = new Date().getMonth();
    return months.map((m, i) => ({ name: m, Demandes: counts[i] })).slice(Math.max(0, curMonth - 5), curMonth + 1);
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.profile?.validator_name || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'Tous' || u.profile?.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered Requests
  const filteredRequests = requests.filter(r => {
    const query = reqSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      (r.order_number || '').toLowerCase().includes(query) ||
      (r.requester_name || '').toLowerCase().includes(query) ||
      (r.assignment || '').toLowerCase().includes(query) ||
      (r.items && r.items.some(i => (i.product || '').toLowerCase().includes(query) || (i.supplier || '').toLowerCase().includes(query)));

    const matchesStatus = reqStatusFilter === 'Tous' || r.status === reqStatusFilter;
    const matchesRequester = reqRequesterFilter === 'Tous' || (r.requester_name || '').toLowerCase() === reqRequesterFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesRequester;
  });

  // Paginated Requests
  const totalReqPages = Math.ceil(filteredRequests.length / reqItemsPerPage) || 1;
  const paginatedRequests = filteredRequests.slice(
    (reqCurrentPage - 1) * reqItemsPerPage,
    reqCurrentPage * reqItemsPerPage
  );

  // Filtered Catalog
  const filteredCatalog = catalogItems.filter(item => {
    const q = catalogSearch.toLowerCase().trim();
    return !q || 
      (item.product_name || '').toLowerCase().includes(q) ||
      (item.supplier || '').toLowerCase().includes(q);
  });

  // Format Date Helper
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Role Badge Helper
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge" style={{ backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444430' }}>🛡️ Super Admin</span>;
      case 'director':
        return <span className="badge" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6', border: '1px solid #8b5cf630' }}>👔 Direction</span>;
      case 'validator':
        return <span className="badge" style={{ backgroundColor: '#f59e0b15', color: '#d97706', border: '1px solid #f59e0b30' }}>✅ Validateur</span>;
      case 'purchasing':
        return <span className="badge" style={{ backgroundColor: '#3b82f615', color: '#2563eb', border: '1px solid #3b82f630' }}>🛒 Achats</span>;
      default:
        return <span className="badge" style={{ backgroundColor: '#10b98115', color: '#059669', border: '1px solid #10b98130' }}>👤 Demandeur</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        color: '#ffffff', 
        borderRadius: 'var(--radius-xl)', 
        padding: '1.75rem 2rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.2)', 
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '0.85rem', 
              color: '#ef4444' 
            }}>
              <Shield size={32} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
                  Superviseur Système & Administration Globale
                </h1>
                <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  rouakrim@sefamar.ma
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                Gestion dynamique des utilisateurs, affectation des validateurs, registre complet et contrôle de l'ensemble du cycle d'achat SEFAMAR.
              </p>
            </div>
          </div>
          
          <button 
            onClick={loadAllData} 
            className="btn btn-secondary" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              color: '#ffffff', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              gap: '0.5rem',
              backdropFilter: 'blur(4px)'
            }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser les données
          </button>
        </div>

        {/* Clean, Organized Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginTop: '1.5rem', 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
          paddingTop: '1rem',
          overflowX: 'auto'
        }}>
          <button 
            onClick={() => setActiveTab('overview')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              backgroundColor: activeTab === 'overview' ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'overview' ? '#ffffff' : '#cbd5e1'
            }}
          >
            <TrendingUp size={16} />
            1. Vue d'ensemble & KPIs
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              backgroundColor: activeTab === 'users' ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'users' ? '#ffffff' : '#cbd5e1'
            }}
          >
            <Users size={16} />
            2. Utilisateurs & Validateurs Attitrés
            <span style={{ 
              backgroundColor: activeTab === 'users' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
              padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' 
            }}>
              {users.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('requests')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              backgroundColor: activeTab === 'requests' ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'requests' ? '#ffffff' : '#cbd5e1'
            }}
          >
            <FileText size={16} />
            3. Registre Complet des Demandes
            <span style={{ 
              backgroundColor: activeTab === 'requests' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
              padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' 
            }}>
              {requests.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('catalog')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              backgroundColor: activeTab === 'catalog' ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'catalog' ? '#ffffff' : '#cbd5e1'
            }}
          >
            <BookOpen size={16} />
            4. Référentiel Fournisseurs
            <span style={{ 
              backgroundColor: activeTab === 'catalog' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
              padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' 
            }}>
              {catalogItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VUE D'ENSEMBLE & KPIS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ backgroundColor: '#3b82f615', color: '#3b82f6', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <FileText size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0 }}>Total Demandes</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{totalRequestsCount}</h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ backgroundColor: '#f59e0b15', color: '#d97706', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <Clock size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0 }}>En Attente</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#d97706' }}>{pendingRequestsCount}</h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ backgroundColor: '#10b98115', color: '#10b981', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <CheckCircle size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0 }}>Validées & Prêtes</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#10b981' }}>{validatedRequestsCount}</h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <ShoppingCart size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0 }}>Commandées / Reçues</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{orderedRequestsCount + receivedRequestsCount}</h3>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{ backgroundColor: '#ef444415', color: '#ef4444', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <TrendingUp size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0 }}>Volume Total Achats</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>
                  {totalSpend.toLocaleString('fr-FR')} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>MAD</span>
                </h3>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: '#ef4444' }} />
                Évolution des Demandes d'Achat (Mois Récents)
              </h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px' }} />
                    <Bar dataKey="Demandes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#3b82f6' }} />
                Répartition des Comptes Utilisateurs
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>Demandeurs Actifs</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#059669' }}>
                    {users.filter(u => u.profile?.role === 'requester').length}
                  </p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>Validateurs Autorisés</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#d97706' }}>
                    {users.filter(u => ['validator', 'director', 'admin'].includes(u.profile?.role)).length}
                  </p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>Service Achats</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#2563eb' }}>
                    {users.filter(u => u.profile?.role === 'purchasing').length}
                  </p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>Articles Catalogue</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#7c3aed' }}>
                    {catalogItems.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UTILISATEURS & AFFECTATION DES VALIDATEURS (TABLEAU DYNAMIQUE) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="card">
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={22} style={{ color: '#ef4444' }} />
                Tableau Dynamique des Utilisateurs & Affectation des Validateurs
              </h2>
              <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0 0' }}>
                Chaque demandeur peut avoir un validateur attitré. Modifiez dynamiquement l'affectation via le menu déroulant en direct.
              </p>
            </div>

            <button 
              onClick={() => setIsAddUserOpen(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', gap: '0.5rem' }}
            >
              <Plus size={16} />
              Ajouter un Utilisateur
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Rechercher par email ou validateur..."
                className="input-field"
                style={{ paddingLeft: '2.5rem', margin: 0 }}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-sm text-muted">Filtrer rôle:</span>
              <select 
                className="input-field" 
                style={{ margin: 0, width: 'auto' }}
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="Tous">Tous les rôles</option>
                <option value="requester">Demandeurs</option>
                <option value="validator">Validateurs</option>
                <option value="purchasing">Service Achat</option>
                <option value="director">Direction</option>
                <option value="admin">Administrateurs</option>
              </select>
            </div>
          </div>

          {/* Dynamic Users Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur / Identifiant</th>
                  <th>Rôle Actuel</th>
                  <th>Validateur Attitré (Dynamique)</th>
                  <th>Date Création</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const currentValId = u.profile?.validator?.id || u.profile?.validator_id || '';
                    const role = u.profile?.role || 'requester';
                    const isProtected = ['rouakrim@sefamar.ma', 'man@sefamar.ma', 'achat@sefamar.ma'].includes(u.username);

                    return (
                      <tr key={u.id} style={{ transition: 'background-color 0.15s' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                              width: '34px', height: '34px', borderRadius: '50%', 
                              backgroundColor: role === 'admin' ? '#ef444420' : '#3b82f620',
                              color: role === 'admin' ? '#ef4444' : '#3b82f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.85rem'
                            }}>
                              {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.9rem' }}>{u.username}</strong>
                              {u.username === 'rouakrim@sefamar.ma' && (
                                <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  (Vous - Super Admin)
                                </span>
                              )}
                              {u.username === 'obelkadi.man@sefamar.ma' && (
                                <span style={{ marginLeft: '0.5rem', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  (Auto-validation)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <select 
                            className="input-field" 
                            style={{ 
                              margin: 0, padding: '0.35rem 0.6rem', fontSize: '0.85rem',
                              fontWeight: 600, width: 'auto', borderRadius: '6px'
                            }}
                            value={role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            disabled={isProtected}
                          >
                            <option value="requester">Demandeur</option>
                            <option value="validator">Validateur</option>
                            <option value="purchasing">Service Achat</option>
                            <option value="director">Direction</option>
                            <option value="admin">Super Admin</option>
                          </select>
                        </td>

                        {/* Dynamic Validator Assignment Dropdown */}
                        <td>
                          {role === 'requester' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select 
                                className="input-field"
                                style={{ 
                                  margin: 0, 
                                  padding: '0.4rem 0.65rem', 
                                  fontSize: '0.85rem',
                                  borderColor: currentValId ? '#10b981' : '#cbd5e1',
                                  backgroundColor: currentValId ? '#f0fdf4' : '#ffffff',
                                  fontWeight: currentValId ? 600 : 400,
                                  borderRadius: '6px'
                                }}
                                value={currentValId}
                                onChange={(e) => handleAssignValidator(u.id, e.target.value)}
                              >
                                <option value="">Par défaut (Tous les validateurs)</option>
                                {potentialValidators.map(pv => (
                                  <option key={pv.id} value={pv.id}>
                                    {pv.username === 'man@sefamar.ma' ? 'Mme EL MANSOURI (DG)' : 
                                     pv.username === 'chadi@sefamar.ma' ? 'Chadi Ismail' :
                                     pv.username === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' :
                                     pv.username === 'rouakrim@sefamar.ma' ? 'Rida Ouakrim (Super Admin)' :
                                     pv.username}
                                  </option>
                                ))}
                              </select>
                              {currentValId && (
                                <UserCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} title="Validateur dédié assigné" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted text-sm" style={{ fontStyle: 'italic' }}>
                              Non applicable ({role})
                            </span>
                          )}
                        </td>

                        <td className="text-sm text-muted">
                          {formatDateDisplay(u.date_joined)}
                        </td>

                        <td>
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                            Actif
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button 
                              onClick={() => {
                                setSelectedUserToReset(u);
                                setIsResetPassOpen(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.35rem' }}
                              title="Réinitialiser le mot de passe"
                            >
                              <Key size={14} />
                              MDP
                            </button>

                            {!isProtected && (
                              <button 
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="btn"
                                style={{ 
                                  padding: '0.35rem 0.65rem', 
                                  backgroundColor: '#fee2e2', 
                                  color: '#dc2626', 
                                  border: 'none',
                                  fontSize: '0.8rem'
                                }}
                                title="Supprimer le compte"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGISTRE GLOBAL DES DEMANDES */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={22} style={{ color: '#ef4444' }} />
                Registre Complet des Demandes d'Achat
              </h2>
              <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0 0' }}>
                Consultez, filtrez et téléchargez toutes les demandes émises dans le système SEFAMAR.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}>
                {filteredRequests.length} demande(s) au total
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="N° demande, demandeur, article..."
                className="input-field"
                style={{ paddingLeft: '2.5rem', margin: 0 }}
                value={reqSearch}
                onChange={(e) => { setReqSearch(e.target.value); setReqCurrentPage(1); }}
              />
            </div>

            <div>
              <select 
                className="input-field" 
                style={{ margin: 0 }}
                value={reqStatusFilter}
                onChange={(e) => { setReqStatusFilter(e.target.value); setReqCurrentPage(1); }}
              >
                <option value="Tous">Tous les Statuts</option>
                <option value="En attente">En attente de validation</option>
                <option value="Validé">Validé (Prêt pour achat)</option>
                <option value="Commandé">Commandé (En cours)</option>
                <option value="Reçu">Reçu (Clôturé)</option>
                <option value="Refusé">Refusé</option>
              </select>
            </div>

            <div>
              <select 
                className="input-field" 
                style={{ margin: 0 }}
                value={reqRequesterFilter}
                onChange={(e) => { setReqRequesterFilter(e.target.value); setReqCurrentPage(1); }}
              >
                <option value="Tous">Tous les Demandeurs</option>
                {Array.from(new Set(requests.map(r => r.requester_name).filter(Boolean))).map(reqName => (
                  <option key={reqName} value={reqName}>{reqName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Date</th>
                  <th>Demandeur</th>
                  <th>Affectation</th>
                  <th>Détail Articles</th>
                  <th>Total Estimé</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Aucune demande trouvée avec ces critères.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => {
                    const totalOrder = (req.items || []).reduce((sum, item) => {
                      const p = parseFloat((item.price || '').replace(/[^0-9.]/g, '')) || 0;
                      const q = parseInt(item.qty, 10) || 1;
                      return sum + (p * q);
                    }, 0);

                    return (
                      <tr key={req.id}>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{req.order_number}</span>
                        </td>
                        <td className="text-sm text-muted">
                          {formatDateDisplay(req.date_created)}
                        </td>
                        <td>
                          <strong>{req.requester_name}</strong>
                          {req.assigned_validator_name && (
                            <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                              <span>Validateur:</span>
                              <span style={{ color: '#059669', fontWeight: 600 }}>{req.assigned_validator_name}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                            {req.assignment || 'Non spécifié'}
                          </span>
                        </td>
                        <td>
                          <div style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(req.items || []).map(it => `${it.qty || 1}x ${it.product}`).join(', ')}
                          </div>
                        </td>
                        <td>
                          <strong>{totalOrder > 0 ? `${totalOrder.toLocaleString('fr-FR')} MAD` : '-'}</strong>
                        </td>
                        <td>
                          {req.status === 'Reçu' && <span className="badge badge-success">Reçu</span>}
                          {req.status === 'Commandé' && <span className="badge badge-info">Commandé</span>}
                          {req.status === 'Refusé' && <span className="badge badge-danger">Refusé</span>}
                          {req.status === 'En attente' && (
                            req.is_validated 
                              ? <span className="badge badge-warning">Validé (À commander)</span> 
                              : <span className="badge badge-warning">En attente validation</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button 
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsDetailModalOpen(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', gap: '0.3rem' }}
                              title="Voir les détails complets"
                            >
                              <Eye size={14} />
                              Détails
                            </button>

                            {req.request_pdf && (
                              <a 
                                href={getMediaUrl(req.request_pdf)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', gap: '0.3rem', color: '#0284c7' }}
                                title="Télécharger le PDF / Pièce jointe"
                              >
                                <Download size={14} />
                                PDF
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalReqPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <span className="text-sm text-muted">
                Page {reqCurrentPage} sur {totalReqPages} ({filteredRequests.length} demandes au total)
              </span>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  onClick={() => setReqCurrentPage(p => Math.max(1, p - 1))}
                  disabled={reqCurrentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <ChevronLeft size={16} /> Précédent
                </button>

                {Array.from({ length: totalReqPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setReqCurrentPage(page)}
                    className="btn"
                    style={{ 
                      padding: '0.35rem 0.75rem', 
                      fontSize: '0.85rem',
                      backgroundColor: reqCurrentPage === page ? '#ef4444' : '#f1f5f9',
                      color: reqCurrentPage === page ? '#ffffff' : '#334155'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button 
                  onClick={() => setReqCurrentPage(p => Math.min(totalReqPages, p + 1))}
                  disabled={reqCurrentPage === totalReqPages}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RÉFÉRENTIEL CATALOGUE FOURNISSEURS */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={22} style={{ color: '#ef4444' }} />
                Référentiel & Catalogue Prix Fournisseurs
              </h2>
              <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0 0' }}>
                Base de données centrale des prix de référence et des partenaires agréés SEFAMAR.
              </p>
            </div>

            <button 
              onClick={() => setIsAddCatalogOpen(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', gap: '0.5rem' }}
            >
              <Plus size={16} />
              Ajouter un Article
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Rechercher par article ou fournisseur..."
              className="input-field"
              style={{ paddingLeft: '2.5rem', margin: 0 }}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Désignation Article</th>
                  <th>Fournisseur Référencé</th>
                  <th>Prix Unitaire Indicatif</th>
                  <th>Unité</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Aucun article répertorié dans le catalogue.
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map(item => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.product_name}</strong>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                          {item.supplier}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#059669' }}>{item.price}</span>
                      </td>
                      <td>{item.unit || 'U'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteCatalogItem(item.id)}
                          className="btn"
                          style={{ padding: '0.35rem 0.65rem', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.8rem' }}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJOUTER UTILISATEUR */}
      {/* ========================================================================= */}
      {isAddUserOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} style={{ color: '#ef4444' }} />
              Ajouter un Nouvel Utilisateur
            </h3>
            
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Email / Identifiant SEFAMAR *
                </label>
                <input 
                  type="email"
                  required
                  placeholder="ex: prenom.nom@sefamar.ma"
                  className="input-field"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Mot de Passe Initial *
                </label>
                <input 
                  type="password"
                  required
                  placeholder="Mot de passe sécurisé"
                  className="input-field"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Rôle Système *
                </label>
                <select 
                  className="input-field"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                >
                  <option value="requester">Demandeur (Crée des demandes d'achat)</option>
                  <option value="validator">Validateur (Approuve les demandes)</option>
                  <option value="purchasing">Équipe Achats (Traite les commandes et devis)</option>
                  <option value="director">Direction (Supervision globale)</option>
                  <option value="admin">Super Admin (Plein accès système)</option>
                </select>
              </div>

              {newUserRole === 'requester' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Validateur Attitré (Optionnel)
                  </label>
                  <select 
                    className="input-field"
                    value={newUserValidator}
                    onChange={(e) => setNewUserValidator(e.target.value)}
                  >
                    <option value="">Aucun (Tous les validateurs par défaut)</option>
                    {potentialValidators.map(pv => (
                      <option key={pv.id} value={pv.id}>
                        {pv.username === 'man@sefamar.ma' ? 'Mme EL MANSOURI (DG)' : 
                         pv.username === 'chadi@sefamar.ma' ? 'Chadi Ismail' :
                         pv.username === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' :
                         pv.username === 'rouakrim@sefamar.ma' ? 'Rida Ouakrim (Super Admin)' :
                         pv.username}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted">
                    Ses demandes seront directement notifiées et confiées à ce validateur.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsAddUserOpen(false)}
                  className="btn btn-secondary"
                  disabled={addingUser}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                  disabled={addingUser}
                >
                  {addingUser ? 'Création en cours...' : 'Créer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RÉINITIALISATION MOT DE PASSE */}
      {/* ========================================================================= */}
      {isResetPassOpen && selectedUserToReset && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} style={{ color: '#ef4444' }} />
              Modifier Mot de Passe
            </h3>
            
            <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              Définir un nouveau mot de passe pour <strong>{selectedUserToReset.username}</strong>.
            </p>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Nouveau mot de passe *
                </label>
                <input 
                  type="password"
                  required
                  placeholder="Nouveau mot de passe"
                  className="input-field"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsResetPassOpen(false); setSelectedUserToReset(null); }}
                  className="btn btn-secondary"
                  disabled={resettingPass}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                  disabled={resettingPass}
                >
                  {resettingPass ? 'Enregistrement...' : 'Enregistrer le Mot de Passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJOUTER ARTICLE CATALOGUE */}
      {/* ========================================================================= */}
      {isAddCatalogOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: '#ef4444' }} />
              Ajouter au Référentiel Catalogue
            </h3>

            <form onSubmit={handleAddCatalogItem}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Désignation du Produit / Service *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Filtre à Huile MAN TGS"
                  className="input-field"
                  value={newCatProduct}
                  onChange={(e) => setNewCatProduct(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Fournisseur *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: MAN TRUCK & BUS / AUTODISTRIBUTION"
                  className="input-field"
                  value={newCatSupplier}
                  onChange={(e) => setNewCatSupplier(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Prix Unitaire (DH HT) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="ex: 450"
                    className="input-field"
                    value={newCatPrice}
                    onChange={(e) => setNewCatPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Unité
                  </label>
                  <input 
                    type="text" 
                    placeholder="U, L, Kg..."
                    className="input-field"
                    value={newCatUnit}
                    onChange={(e) => setNewCatUnit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsAddCatalogOpen(false)}
                  className="btn btn-secondary"
                  disabled={addingCatalog}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                  disabled={addingCatalog}
                >
                  {addingCatalog ? 'Ajout...' : 'Ajouter au Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DÉTAIL D'UNE DEMANDE */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedRequest && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Demande {selectedRequest.order_number}
                </h3>
                <span className="text-sm text-muted">
                  Créée le {formatDateDisplay(selectedRequest.date_created)} par <strong>{selectedRequest.requester_name}</strong>
                </span>
              </div>
              <button 
                onClick={() => { setIsDetailModalOpen(false); setSelectedRequest(null); }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.5rem', borderRadius: '50%' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Statut Actuel</p>
                <p style={{ fontWeight: 700, margin: '0.2rem 0 0 0' }}>{selectedRequest.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Affectation / Chantier</p>
                <p style={{ fontWeight: 600, margin: '0.2rem 0 0 0' }}>{selectedRequest.assignment || 'Non spécifié'}</p>
              </div>
              <div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Validation</p>
                <p style={{ fontWeight: 600, margin: '0.2rem 0 0 0', color: selectedRequest.is_validated ? '#10b981' : '#f59e0b' }}>
                  {selectedRequest.is_validated ? `Validé par ${selectedRequest.validated_by_name || 'Direction'}` : 'En attente'}
                </p>
              </div>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Articles Demandés</h4>
            <div className="table-container" style={{ marginBottom: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Quantité</th>
                    <th>Prix Estimé</th>
                    <th>Fournisseur</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedRequest.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td><strong>{it.product}</strong></td>
                      <td>{it.qty || 1}</td>
                      <td>{it.price || '-'}</td>
                      <td>{it.supplier || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRequest.request_pdf && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} style={{ color: '#0284c7' }} />
                  <span className="text-sm" style={{ fontWeight: 600, color: '#0369a1' }}>
                    Document PDF ou Image(s) Jointe(s) disponible
                  </span>
                </div>
                <a 
                  href={getMediaUrl(selectedRequest.request_pdf)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', gap: '0.35rem' }}
                >
                  <ExternalLink size={14} /> Ouvrir le document
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                onClick={() => { setIsDetailModalOpen(false); setSelectedRequest(null); }}
                className="btn btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
