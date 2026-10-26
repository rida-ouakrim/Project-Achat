import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Filter, Shield, Key, Trash2, Edit3, 
  Building2, CheckCircle2, XCircle, FileText, ArrowUpDown, RefreshCw,
  UserCheck, AlertTriangle, ChevronRight, Check, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  fetchUsers, createUser, updateUserFull, deleteUser, resetUserPassword 
} from '../api';

const COMPANIES = ['SEFAMAR', 'SOMABUS', 'CKD'];

const ROLES = [
  { value: 'requester', label: 'Demandeur' },
  { value: 'validator', label: 'Validateur Responsable' },
  { value: 'purchasing', label: 'Équipe Achats' },
  { value: 'director', label: 'Directeur (DG)' },
  { value: 'admin', label: 'Administrateur Superviseur' },
  { value: 'ai_tools', 'label': 'Outils IA' }
];

const getCompanyBadgeStyle = (company) => {
  switch ((company || '').toUpperCase()) {
    case 'SOMABUS':
      return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
    case 'CKD':
      return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
    case 'SEFAMAR':
    default:
      return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
  }
};

const getRoleBadgeStyle = (role) => {
  switch (role) {
    case 'admin':
      return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' };
    case 'director':
      return { backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff' };
    case 'purchasing':
      return { backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' };
    case 'validator':
      return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
    case 'ai_tools':
      return { backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' };
    case 'requester':
    default:
      return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  }
};

const getRoleLabel = (role) => {
  const found = ROLES.find(r => r.value === role);
  return found ? found.label : (role || 'Demandeur');
};

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('Tous');
  const [roleFilter, setRoleFilter] = useState('Tous');

  // Modal Création
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    role: 'requester',
    company: 'SEFAMAR',
    validator_id: ''
  });
  const [creating, setCreating] = useState(false);

  // Modal Édition Complète
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    username: '',
    role: 'requester',
    company: 'SEFAMAR',
    validator_id: '',
    password: '',
    is_active: true
  });
  const [updating, setUpdating] = useState(false);

  // Modal Changement Mot de Passe Rapide
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passUser, setPassUser] = useState(null);
  const [quickPassword, setQuickPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // Modal Confirmation Suppression
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Liste des validateurs potentiels
  const potentialValidators = useMemo(() => {
    return users.filter(u => {
      const role = u.profile?.role;
      return role === 'validator' || role === 'director' || role === 'admin' ||
        ['man@sefamar.ma', 'chadi@sefamar.ma', 'g.benelhassane@sefamar.ma', 'rouakrim@sefamar.ma'].includes(u.username);
    });
  }, [users]);

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const username = (u.username || '').toLowerCase();
      const role = u.profile?.role || 'requester';
      const company = (u.profile?.company || 'SEFAMAR').toUpperCase();
      const validator = (u.profile?.validator_name || '').toLowerCase();

      const matchesSearch = 
        !search ||
        username.includes(search.toLowerCase()) ||
        validator.includes(search.toLowerCase()) ||
        company.toLowerCase().includes(search.toLowerCase());

      const matchesCompany = companyFilter === 'Tous' || company === companyFilter;
      const matchesRole = roleFilter === 'Tous' || role === roleFilter;

      return matchesSearch && matchesCompany && matchesRole;
    });
  }, [users, search, companyFilter, roleFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const total = users.length;
    const sefamar = users.filter(u => (u.profile?.company || 'SEFAMAR').toUpperCase() === 'SEFAMAR').length;
    const somabus = users.filter(u => (u.profile?.company || '').toUpperCase() === 'SOMABUS').length;
    const ckd = users.filter(u => (u.profile?.company || '').toUpperCase() === 'CKD').length;
    const totalRequests = users.reduce((acc, u) => acc + (u.requests_count || 0), 0);
    return { total, sefamar, somabus, ckd, totalRequests };
  }, [users]);

  // Création d'un utilisateur
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.username.trim() || !createForm.password.trim()) {
      toast.error("Le nom d'utilisateur et le mot de passe sont obligatoires.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        username: createForm.username.trim(),
        password: createForm.password.trim(),
        role: createForm.role,
        company: createForm.company,
        validator_id: createForm.validator_id ? parseInt(createForm.validator_id) : null
      };
      await createUser(payload);
      toast.success(`Utilisateur ${createForm.username} créé avec succès !`);
      setIsCreateOpen(false);
      setCreateForm({
        username: '',
        password: '',
        role: 'requester',
        company: 'SEFAMAR',
        validator_id: ''
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erreur lors de la création de l'utilisateur.");
    } finally {
      setCreating(false);
    }
  };

  // Ouverture modal édition
  const handleOpenEdit = (user) => {
    setEditForm({
      id: user.id,
      username: user.username,
      role: user.profile?.role || 'requester',
      company: user.profile?.company || 'SEFAMAR',
      validator_id: user.profile?.validator_id ? String(user.profile.validator_id) : '',
      password: '',
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setIsEditOpen(true);
  };

  // Soumission modification complète
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.id) return;

    setUpdating(true);
    try {
      const payload = {
        username: editForm.username.trim(),
        role: editForm.role,
        company: editForm.company,
        validator_id: editForm.validator_id ? parseInt(editForm.validator_id) : null,
        is_active: editForm.is_active
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await updateUserFull(editForm.id, payload);
      toast.success("Utilisateur mis à jour avec succès !");
      setIsEditOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Erreur lors de la mise à jour.");
    } finally {
      setUpdating(false);
    }
  };

  // Changement rapide de mot de passe
  const handleQuickPassSubmit = async (e) => {
    e.preventDefault();
    if (!passUser || !quickPassword.trim()) return;

    setSavingPass(true);
    try {
      await resetUserPassword(passUser.id, quickPassword.trim());
      toast.success(`Mot de passe de ${passUser.username} réinitialisé avec succès !`);
      setIsPassModalOpen(false);
      setQuickPassword('');
      setPassUser(null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de réinitialiser le mot de passe.");
    } finally {
      setSavingPass(false);
    }
  };

  // Suppression utilisateur
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      toast.success(`Utilisateur ${userToDelete.username} supprimé.`);
      setUserToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Impossible de supprimer cet utilisateur.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* En-tête de la page */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '10px', color: '#ef4444', display: 'flex' }}>
              <Users size={24} />
            </div>
            Espace Utilisateurs Multi-Entreprises
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Gérez les comptes, les rôles, les validateurs et l'affectation par société (SEFAMAR, SOMABUS, CKD).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={loadData} 
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}
            title="Rafraîchir les données"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 600, backgroundColor: '#2563eb' }}
          >
            <UserPlus size={18} />
            Créer un Utilisateur
          </button>
        </div>
      </div>

      {/* Cartes KPI Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>TOTAL COMPTES</span>
            <Users size={20} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Utilisateurs enregistrés</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>SEFAMAR</span>
            <Building2 size={20} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0369a1' }}>{stats.sefamar}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Comptes SEFAMAR</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>SOMABUS</span>
            <Building2 size={20} style={{ color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b45309' }}>{stats.somabus}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Comptes SOMABUS</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>CKD</span>
            <Building2 size={20} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d' }}>{stats.ckd}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Comptes CKD</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>DEMANDES CRÉÉES</span>
            <FileText size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalRequests}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Total des flux initiés</div>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Rechercher par nom, email, validateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>
          {search && (
            <button 
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              title="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtre Entreprise */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Entreprise:</span>
            <select 
              value={companyFilter} 
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', width: 'auto' }}
            >
              <option value="Tous">Toutes les Entreprises</option>
              {COMPANIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtre Rôle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rôle:</span>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', width: 'auto' }}
            >
              <option value="Tous">Tous les Rôles</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des Utilisateurs */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
            Chargement des utilisateurs en cours...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <Users size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem auto' }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Aucun utilisateur trouvé</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Essayez d'ajuster votre recherche ou vos filtres.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>UTILISATEUR</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>ENTREPRISE</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>RÔLE MÉTIER</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>VALIDATEUR ATTITRÉ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>DEMANDES</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>DATE CRÉATION</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const company = (u.profile?.company || 'SEFAMAR').toUpperCase();
                  const role = u.profile?.role || 'requester';
                  const validatorName = u.profile?.validator_name;
                  const reqCount = u.requests_count || 0;
                  const isProtected = ['rouakrim@sefamar.ma', 'achat@sefamar.ma', 'man@sefamar.ma'].includes(u.username);

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                      
                      {/* Utilisateur */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            backgroundColor: '#eff6ff', 
                            color: '#2563eb', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700, 
                            fontSize: '0.9rem',
                            border: '1px solid #bfdbfe'
                          }}>
                            {(u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {u.username}
                              {u.is_active === false && (
                                <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                                  Inactif
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              ID #{u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Entreprise */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ 
                          ...getCompanyBadgeStyle(company),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em'
                        }}>
                          <Building2 size={13} />
                          {company}
                        </span>
                      </td>

                      {/* Rôle */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ 
                          ...getRoleBadgeStyle(role),
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {getRoleLabel(role)}
                        </span>
                      </td>

                      {/* Validateur attitré */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {validatorName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0f172a', fontSize: '0.85rem', fontWeight: 500 }}>
                            <UserCheck size={15} style={{ color: '#16a34a' }} />
                            <span>{validatorName}</span>
                          </div>
                        ) : role === 'requester' ? (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Validation Globale (Mme EL MANSOURI / Chadi)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Nombre de demandes */}
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: reqCount > 0 ? '#f0fdf4' : '#f8fafc',
                          color: reqCount > 0 ? '#166534' : '#64748b',
                          border: reqCount > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                        }}>
                          <FileText size={13} />
                          {reqCount}
                        </span>
                      </td>

                      {/* Date de création */}
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#64748b' }}>
                        {u.date_joined || '-'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button 
                            onClick={() => handleOpenEdit(u)}
                            className="btn btn-outline"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Modifier l'utilisateur"
                          >
                            <Edit3 size={14} />
                            Modifier
                          </button>

                          <button 
                            onClick={() => {
                              setPassUser(u);
                              setQuickPassword('');
                              setIsPassModalOpen(true);
                            }}
                            className="btn btn-outline"
                            style={{ padding: '0.3rem 0.5rem', color: '#d97706', borderColor: '#fde68a' }}
                            title="Réinitialiser le mot de passe"
                          >
                            <Key size={14} />
                          </button>

                          {!isProtected && (
                            <button 
                              onClick={() => setUserToDelete(u)}
                              className="btn btn-outline"
                              style={{ padding: '0.3rem 0.5rem', color: '#dc2626', borderColor: '#fecaca' }}
                              title="Supprimer l'utilisateur"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CRÉATION UTILISATEUR */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '8px' }}>
                  <UserPlus size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Créer un Nouvel Utilisateur</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Identifiant / Email */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Nom d'utilisateur / Email *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: demandeur.somabus@sefamar.ma"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Mot de passe initial *</label>
                  <input 
                    type="password" 
                    placeholder="Saisissez un mot de passe sécurisé"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                {/* Choix de l'Entreprise (SEFAMAR / SOMABUS / CKD) */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={16} />
                    Entreprise / Société *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {COMPANIES.map(comp => (
                      <button
                        type="button"
                        key={comp}
                        onClick={() => setCreateForm({ ...createForm, company: comp })}
                        style={{
                          padding: '0.6rem 0.5rem',
                          borderRadius: '8px',
                          border: createForm.company === comp ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: createForm.company === comp ? '#eff6ff' : '#ffffff',
                          color: createForm.company === comp ? '#1e40af' : '#334155',
                          fontWeight: createForm.company === comp ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        {createForm.company === comp && <Check size={14} />}
                        {comp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rôle */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Rôle Métier *</label>
                  <select 
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="form-input"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Validateur affecté (Pertinent si demandeur) */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <UserCheck size={16} />
                    Validateur Attitré (Responsable direct)
                  </label>
                  <select 
                    value={createForm.validator_id}
                    onChange={(e) => setCreateForm({ ...createForm, validator_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">-- Aucun validateur spécifique (Validation standard) --</option>
                    {potentialValidators.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.username} ({getRoleLabel(v.profile?.role)} - {v.profile?.company || 'SEFAMAR'})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Les demandes créées par cet utilisateur seront automatiquement soumises à ce responsable.
                  </span>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-outline"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {creating ? 'Création en cours...' : 'Créer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ÉDITION COMPLÈTE */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '8px' }}>
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Modifier l'Utilisateur</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Modification complète des permissions et de l'affectation</span>
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Identifiant */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Nom d'utilisateur / Email *</label>
                  <input 
                    type="text" 
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                {/* Entreprise */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={16} />
                    Entreprise / Société *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {COMPANIES.map(comp => (
                      <button
                        type="button"
                        key={comp}
                        onClick={() => setEditForm({ ...editForm, company: comp })}
                        style={{
                          padding: '0.6rem 0.5rem',
                          borderRadius: '8px',
                          border: editForm.company === comp ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: editForm.company === comp ? '#eff6ff' : '#ffffff',
                          color: editForm.company === comp ? '#1e40af' : '#334155',
                          fontWeight: editForm.company === comp ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        {editForm.company === comp && <Check size={14} />}
                        {comp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rôle */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Rôle Métier *</label>
                  <select 
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="form-input"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Validateur affecté */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <UserCheck size={16} />
                    Validateur Attitré (Responsable direct)
                  </label>
                  <select 
                    value={editForm.validator_id}
                    onChange={(e) => setEditForm({ ...editForm, validator_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">-- Aucun validateur spécifique (Validation standard) --</option>
                    {potentialValidators
                      .filter(v => v.id !== editForm.id)
                      .map(v => (
                        <option key={v.id} value={v.id}>
                          {v.username} ({getRoleLabel(v.profile?.role)} - {v.profile?.company || 'SEFAMAR'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Nouveau mot de passe (optionnel) */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Key size={16} />
                    Nouveau Mot de Passe (Laisser vide si inchangé)
                  </label>
                  <input 
                    type="password" 
                    placeholder="Optionnel : nouveau mot de passe"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="form-input"
                  />
                </div>

                {/* Statut Compte */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input 
                    type="checkbox" 
                    id="isActiveCheckbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isActiveCheckbox" style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}>
                    Compte actif et autorisé à se connecter
                  </label>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="btn btn-outline"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={updating}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {updating ? 'Enregistrement...' : 'Enregistrer les Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHANGEMENT RAPIDE DE MOT DE PASSE */}
      {isPassModalOpen && passUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '8px' }}>
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Mot de Passe</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{passUser.username}</span>
                </div>
              </div>
              <button onClick={() => setIsPassModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleQuickPassSubmit} style={{ marginTop: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Nouveau Mot de Passe *</label>
                <input 
                  type="password" 
                  placeholder="Saisissez le nouveau mot de passe"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => setIsPassModalOpen(false)}
                  className="btn btn-outline"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={savingPass}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#d97706' }}
                >
                  {savingPass ? 'Mise à jour...' : 'Appliquer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      {userToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
                  <AlertTriangle size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#991b1b' }}>Confirmer la Suppression</h3>
              </div>
            </div>

            <div style={{ marginTop: '1rem', color: '#334155', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Êtes-vous sûr de vouloir supprimer définitivement le compte de <strong>{userToDelete.username}</strong> ({userToDelete.profile?.company || 'SEFAMAR'}) ?
              <br /><br />
              <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                ⚠️ Cette action est irréversible.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button 
                type="button" 
                onClick={() => setUserToDelete(null)}
                className="btn btn-outline"
              >
                Annuler
              </button>
              <button 
                type="button" 
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626' }}
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersManagement;
