import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, Search, Filter, Shield, Key, Trash2, Edit3,
  Building2, CheckCircle2, XCircle, FileText, ArrowUpDown, RefreshCw,
  UserCheck, AlertTriangle, ChevronRight, Check, X, Briefcase, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchUsers, createUser, updateUserFull, deleteUser, resetUserPassword
} from '../api';

const COMPANIES = ['SEFAMAR', 'SOMABUS', 'CKD', 'Succursale'];
const CITIES = ['Agadir', 'Meknès', 'Laâyoune', 'Marrakech', 'Tanger', 'Nador', 'Dakhla'];

const STANDARD_DEPARTMENTS = [
  { value: 'Magasinier', label: 'Magasinier (Pièces & Stock)', icon: '📦' },
  { value: 'Atelier', label: 'Atelier (SAV & Maintenance)', icon: '🔧' },
  { value: 'ADV', label: 'ADV (Administration Des Ventes)', icon: '📑' },
  { value: 'Commercial', label: 'Commercial / Ventes', icon: '💼' },
  { value: 'Comptabilité', label: 'Comptabilité / Finance', icon: '📊' },
  { value: 'Informatique', label: 'Informatique / IT', icon: '💻' },
  { value: 'Moyens Généraux', label: 'Moyens Généraux', icon: '🏢' },
  { value: 'Direction', label: 'Direction Générale', icon: '👑' }
];

const ROLES = [
  { value: 'requester', label: 'Demandeur' },
  { value: 'validator', label: 'Validateur Responsable' },
  { value: 'purchasing', label: 'Équipe Achats' },
  { value: 'director', label: 'Directeur (DG)' },
  { value: 'admin', label: 'Administrateur Superviseur' },
  { value: 'ai_tools', label: 'Outils IA' }
];

const getCompanyBadgeStyle = (company) => {
  switch ((company || '').toUpperCase()) {
    case 'SOMABUS':
      return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
    case 'CKD':
      return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
    case 'SUCCURSALE':
      return { backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' };
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
  const [departmentFilter, setDepartmentFilter] = useState('Tous');

  // Modal Création
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'requester',
    company: 'SEFAMAR',
    city: '',
    departmentSelect: '',
    departmentCustom: '',
    validator_ids: [],
    assigned_requester_ids: []
  });
  const [creating, setCreating] = useState(false);

  // Modal Édition Complète
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    email: '',
    role: 'requester',
    company: 'SEFAMAR',
    city: '',
    departmentSelect: '',
    departmentCustom: '',
    validator_ids: [],
    assigned_requester_ids: [],
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

  // Liste des demandeurs potentiels (pour assignation à un validateur)
  const potentialRequesters = useMemo(() => {
    return users.filter(u => {
      const role = u.profile?.role || 'requester';
      return role === 'requester';
    });
  }, [users]);

  // Liste unique de tous les départements pour le filtre
  const allDepartmentsList = useMemo(() => {
    const list = new Set(STANDARD_DEPARTMENTS.map(d => d.value));
    users.forEach(u => {
      if (u.profile?.department && u.profile.department.trim()) {
        list.add(u.profile.department.trim());
      }
    });
    return Array.from(list);
  }, [users]);

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const username = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const fullName = (u.profile?.full_name || u.display_name || '').toLowerCase();
      const role = u.profile?.role || 'requester';
      const company = (u.profile?.company || 'SEFAMAR').toUpperCase();
      const department = (u.profile?.department || '').trim();
      const validator = (u.profile?.validator_name || '').toLowerCase();

      const matchesSearch =
        !search ||
        username.includes(search.toLowerCase()) ||
        email.includes(search.toLowerCase()) ||
        fullName.includes(search.toLowerCase()) ||
        validator.includes(search.toLowerCase()) ||
        company.toLowerCase().includes(search.toLowerCase()) ||
        department.toLowerCase().includes(search.toLowerCase());

      const matchesCompany = companyFilter === 'Tous' || company === companyFilter;
      const matchesRole = roleFilter === 'Tous' || role === roleFilter;
      const matchesDept = departmentFilter === 'Tous' ||
        (departmentFilter === 'Non renseigné' ? !department : department.toLowerCase() === departmentFilter.toLowerCase());

      return matchesSearch && matchesCompany && matchesRole && matchesDept;
    });
  }, [users, search, companyFilter, roleFilter, departmentFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const total = users.length;
    const sefamar = users.filter(u => (u.profile?.company || 'SEFAMAR').toUpperCase() === 'SEFAMAR').length;
    const somabus = users.filter(u => (u.profile?.company || '').toUpperCase() === 'SOMABUS').length;
    const ckd = users.filter(u => (u.profile?.company || '').toUpperCase() === 'CKD').length;
    const succursales = users.filter(u => (u.profile?.company || '').toUpperCase() === 'SUCCURSALE').length;
    const withDept = users.filter(u => u.profile?.department && u.profile.department.trim()).length;
    const totalRequests = users.reduce((acc, u) => acc + (u.requests_count || 0), 0);
    return { total, sefamar, somabus, ckd, succursales, withDept, totalRequests };
  }, [users]);

  // Création d'un utilisateur
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error("Le nom complet, l'adresse email et le mot de passe sont obligatoires.");
      return;
    }

    if (createForm.company === 'Succursale' && !createForm.city) {
      toast.error("Veuillez sélectionner la ville de la succursale (ex: Agadir, Tanger, etc.).");
      return;
    }

    // Déterminer le département final
    let finalDept = '';
    if (createForm.departmentSelect === 'custom') {
      finalDept = createForm.departmentCustom.trim();
    } else {
      finalDept = createForm.departmentSelect.trim();
    }

    setCreating(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        full_name: createForm.name.trim(),
        email: createForm.email.trim(),
        username: createForm.email.trim(),
        password: createForm.password.trim(),
        role: createForm.role,
        company: createForm.company,
        city: createForm.company === 'Succursale' ? createForm.city : '',
        department: finalDept,
        validator_ids: createForm.role === 'requester' ? createForm.validator_ids : [],
        validator_id: createForm.role === 'requester' && createForm.validator_ids.length > 0 ? createForm.validator_ids[0] : null,
        assigned_requester_ids: ['validator', 'director'].includes(createForm.role) ? createForm.assigned_requester_ids : []
      };
      await createUser(payload);
      toast.success(`Utilisateur ${createForm.name} (${createForm.email}) créé avec succès !`);
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'requester',
        company: 'SEFAMAR',
        city: '',
        departmentSelect: '',
        departmentCustom: '',
        validator_ids: [],
        assigned_requester_ids: []
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
    const userDept = user.profile?.department || '';
    const isStandard = STANDARD_DEPARTMENTS.some(d => d.value.toLowerCase() === userDept.toLowerCase());
    const fullName = user.profile?.full_name || user.display_name || ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.username;

    const initialValIds = (user.profile?.validator_ids && user.profile.validator_ids.length > 0)
      ? user.profile.validator_ids
      : (user.profile?.validator_id ? [user.profile.validator_id] : []);

    const initialReqIds = user.profile?.assigned_requester_ids || [];

    setEditForm({
      id: user.id,
      name: fullName,
      email: user.email || user.username,
      role: user.profile?.role || 'requester',
      company: user.profile?.company || 'SEFAMAR',
      city: user.profile?.city || '',
      departmentSelect: isStandard ? userDept : (userDept ? 'custom' : ''),
      departmentCustom: isStandard ? '' : userDept,
      validator_ids: initialValIds,
      assigned_requester_ids: initialReqIds,
      password: '',
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setIsEditOpen(true);
  };

  // Soumission modification complète
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.id) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Le nom complet et l'adresse email sont obligatoires.");
      return;
    }

    if (editForm.company === 'Succursale' && !editForm.city) {
      toast.error("Veuillez sélectionner la ville de la succursale (ex: Agadir, Tanger, etc.).");
      return;
    }

    let finalDept = '';
    if (editForm.departmentSelect === 'custom') {
      finalDept = editForm.departmentCustom.trim();
    } else {
      finalDept = editForm.departmentSelect.trim();
    }

    setUpdating(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        full_name: editForm.name.trim(),
        email: editForm.email.trim(),
        username: editForm.email.trim(),
        role: editForm.role,
        company: editForm.company,
        city: editForm.company === 'Succursale' ? editForm.city : '',
        department: finalDept,
        validator_ids: editForm.role === 'requester' ? editForm.validator_ids : [],
        validator_id: editForm.role === 'requester' && editForm.validator_ids.length > 0 ? editForm.validator_ids[0] : null,
        assigned_requester_ids: ['validator', 'director'].includes(editForm.role) ? editForm.assigned_requester_ids : [],
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
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* En-tête de la page */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '10px', color: '#ef4444', display: 'flex' }}>
              <Users size={24} />
            </div>
            Espace Utilisateurs Multi-Entreprises & Services
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Gérez les comptes, les entreprises (SEFAMAR, SOMABUS, CKD), les services (Magasinier, Atelier, ADV...) et les validateurs.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
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
            <span style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>SUCCURSALES</span>
            <MapPin size={20} style={{ color: '#0d9488' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f766e' }}>{stats.succursales}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Branches régionales</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>AVEC SERVICE DÉFINI</span>
            <Briefcase size={20} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{stats.withDept}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Départements renseignés</div>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, service, validateur..."
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
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Société:</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="Tous">Toutes les Sociétés</option>
              {COMPANIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtre Département / Service */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Service:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="Tous">Tous les Services</option>
              <option value="Non renseigné">-- Non renseigné --</option>
              {allDepartmentsList.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
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
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
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
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>UTILISATEUR (NOM & EMAIL)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>ENTREPRISE</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>SERVICE / DÉPARTEMENT</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>RÔLE MÉTIER</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>VALIDATEUR / DEMANDEURS</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>DEMANDES</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>DATE CRÉATION</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const company = (u.profile?.company || 'SEFAMAR').toUpperCase();
                  const city = (u.profile?.city || '').trim();
                  const department = (u.profile?.department || '').trim();
                  const role = u.profile?.role || 'requester';
                  const validatorName = u.profile?.validator_name;
                  const reqCount = u.requests_count || 0;
                  const isProtected = ['rouakrim@sefamar.ma', 'achat@sefamar.ma', 'man@sefamar.ma'].includes(u.username);
                  const fullName = u.profile?.full_name || u.display_name || ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username;
                  const emailAddress = u.email || u.username;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>

                      {/* Utilisateur (Nom + Email) */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            border: '1px solid #bfdbfe',
                            flexShrink: 0
                          }}>
                            {(fullName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {fullName}
                              {u.is_active === false && (
                                <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                                  Inactif
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>{emailAddress}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span style={{ color: '#94a3b8' }}>ID #{u.id}</span>
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
                          letterSpacing: '0.02em',
                          whiteSpace: 'nowrap'
                        }}>
                          {company === 'SUCCURSALE' ? <MapPin size={13} /> : <Building2 size={13} />}
                          {company === 'SUCCURSALE' && city ? `Succursale - ${city}` : (u.profile?.company || company)}
                        </span>
                      </td>

                      {/* Service / Département */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {department ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.6rem',
                            backgroundColor: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            <Briefcase size={12} style={{ color: '#64748b' }} />
                            {department}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Non renseigné
                          </span>
                        )}
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

                      {/* Validateur attitré / Demandeurs supervisés */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {role === 'validator' || role === 'director' ? (
                          (u.profile?.assigned_requester_ids && u.profile.assigned_requester_ids.length > 0) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d', fontSize: '0.82rem', fontWeight: 600 }}>
                              <UserCheck size={14} style={{ color: '#16a34a' }} />
                              <span>{u.profile.assigned_requester_ids.length} demandeur(s) assigné(s)</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                              Tous demandeurs {company === 'SUCCURSALE' && city ? `Succursale ${city}` : (u.profile?.company || company)}
                            </span>
                          )
                        ) : role === 'requester' ? (
                          (u.profile?.validator_ids && u.profile.validator_ids.length > 0) || validatorName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0f172a', fontSize: '0.85rem', fontWeight: 500 }}>
                              <UserCheck size={15} style={{ color: '#16a34a' }} />
                              <span>{validatorName || `${u.profile?.validator_ids?.length || 1} validateur(s)`}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Validateur {company === 'SUCCURSALE' && city ? `Succursale ${city}` : (u.profile?.company || company)}
                            </span>
                          )
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
          <div className="modal-content" style={{ maxWidth: '560px' }}>
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

                {/* Nom & Prénom */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Nom Complet (Nom & Prénom) *</label>
                  <input
                    type="text"
                    placeholder="Ex: Mohamed Alami"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="form-input"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Le nom et prénom qui apparaîtront sur les demandes et signatures.
                  </span>
                </div>

                {/* Adresse Email */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Adresse Email (Identifiant de connexion) *</label>
                  <input
                    type="email"
                    placeholder="Ex: m.alami@sefamar.ma"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="form-input"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Sera utilisé pour se connecter à l'application et recevoir les notifications.
                  </span>
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

                {/* Choix de l'Entreprise (SEFAMAR / SOMABUS / CKD / Succursale) */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={16} />
                    Entreprise / Société *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem', marginTop: '0.25rem' }}>
                    {COMPANIES.map(comp => (
                      <button
                        type="button"
                        key={comp}
                        onClick={() => {
                          const newCity = comp === 'Succursale' ? (createForm.city || CITIES[0]) : '';
                          setCreateForm({ ...createForm, company: comp, city: newCity });
                        }}
                        style={{
                          padding: '0.6rem 0.4rem',
                          borderRadius: '8px',
                          border: createForm.company === comp ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: createForm.company === comp ? '#eff6ff' : '#ffffff',
                          color: createForm.company === comp ? '#1e40af' : '#334155',
                          fontWeight: createForm.company === comp ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          fontSize: '0.82rem'
                        }}
                      >
                        {createForm.company === comp && <Check size={14} />}
                        {comp}
                      </button>
                    ))}
                  </div>

                  {/* Choix de la Ville si Succursale */}
                  {createForm.company === 'Succursale' && (
                    <div style={{ marginTop: '0.65rem', padding: '0.75rem', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px' }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                        <MapPin size={15} />
                        Ville de la Succursale *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.35rem' }}>
                        {CITIES.map(city => {
                          const isSelected = createForm.city === city;
                          return (
                            <button
                              type="button"
                              key={city}
                              onClick={() => setCreateForm({ ...createForm, city })}
                              style={{
                                padding: '0.4rem 0.5rem',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                                backgroundColor: isSelected ? '#ccfbf1' : '#ffffff',
                                color: isSelected ? '#0f766e' : '#334155',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              {isSelected && <Check size={12} />}
                              {city}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Service / Département (Optionnel avec choix prédéfini ou saisie manuelle) */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Briefcase size={16} />
                      Service / Département
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Optionnel</span>
                  </label>
                  <select
                    value={createForm.departmentSelect}
                    onChange={(e) => setCreateForm({ ...createForm, departmentSelect: e.target.value })}
                    className="form-input"
                  >
                    <option value="">-- Aucun service défini (Optionnel) --</option>
                    {STANDARD_DEPARTMENTS.map(d => (
                      <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                    ))}
                    <option value="custom">✏️ Autre service (Saisir manuellement)...</option>
                  </select>

                  {/* Champ de saisie manuelle si "custom" */}
                  {createForm.departmentSelect === 'custom' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Saisissez le nom du service (ex: Peinture, Qualité, etc.)..."
                        value={createForm.departmentCustom}
                        onChange={(e) => setCreateForm({ ...createForm, departmentCustom: e.target.value })}
                        className="form-input"
                        autoFocus
                      />
                    </div>
                  )}
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

                {/* Affectation selon le rôle */}
                {['validator', 'director'].includes(createForm.role) ? (
                  /* Choix des Demandeurs affectés à ce Validateur (Choix multiple) */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <UserCheck size={16} />
                        Demandeurs Supervisés (Choix de 1 ou plusieurs demandeurs)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                        {createForm.assigned_requester_ids.length} sélectionné(s)
                      </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                      Par défaut, sans sélection, ce validateur reçoit toutes les demandes de <strong>{createForm.company}</strong>. Cochez ci-dessous les demandeurs spécifiques :
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          const ids = potentialRequesters
                            .filter(r => (r.profile?.company || 'SEFAMAR').toUpperCase() === createForm.company.toUpperCase())
                            .map(r => r.id);
                          setCreateForm({ ...createForm, assigned_requester_ids: ids });
                        }}
                      >
                        Tous ceux de {createForm.company}
                      </button>
                      {createForm.company === 'Succursale' && createForm.city && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#0f766e', borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }}
                          onClick={() => {
                            const ids = potentialRequesters
                              .filter(r => (r.profile?.company || '').toUpperCase() === 'SUCCURSALE' && (r.profile?.city || '').toLowerCase() === createForm.city.toLowerCase())
                              .map(r => r.id);
                            setCreateForm({ ...createForm, assigned_requester_ids: ids });
                          }}
                        >
                          Demandeurs de {createForm.city}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#64748b' }}
                        onClick={() => setCreateForm({ ...createForm, assigned_requester_ids: [] })}
                      >
                        Désélectionner tout
                      </button>
                    </div>

                    <div style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      {potentialRequesters.map(req => {
                        const isChecked = createForm.assigned_requester_ids.includes(req.id);
                        const reqName = req.profile?.full_name || req.display_name || req.username;
                        const reqEmail = req.email || req.username;
                        const reqComp = req.profile?.company || 'SEFAMAR';
                        const reqCity = req.profile?.city || '';
                        const reqDept = req.profile?.department;

                        return (
                          <label
                            key={req.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.35rem 0.5rem',
                              backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                              border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.82rem'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCreateForm({ ...createForm, assigned_requester_ids: [...createForm.assigned_requester_ids, req.id] });
                                } else {
                                  setCreateForm({ ...createForm, assigned_requester_ids: createForm.assigned_requester_ids.filter(id => id !== req.id) });
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{reqName}</span>
                                <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.35rem' }}>({reqEmail})</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                {reqDept && (
                                  <span style={{ fontSize: '0.7rem', padding: '1px 5px', backgroundColor: '#e2e8f0', borderRadius: '4px', color: '#334155' }}>
                                    {reqDept}
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: reqComp === 'SOMABUS' ? '#b45309' : reqComp === 'CKD' ? '#15803d' : reqComp === 'SUCCURSALE' ? '#0f766e' : '#0369a1'
                                }}>
                                  {reqComp === 'SUCCURSALE' && reqCity ? `Succursale - ${reqCity}` : reqComp}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                      {potentialRequesters.length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem', textAlign: 'center' }}>
                          Aucun compte demandeur disponible pour le moment.
                        </span>
                      )}
                    </div>
                  </div>
                ) : createForm.role === 'requester' ? (
                  /* Choix des Validateurs pour ce Demandeur */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <UserCheck size={16} />
                        Validateur(s) Attitré(s) (Choix de 1 ou plusieurs)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                        {createForm.validator_ids.length} sélectionné(s)
                      </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                      Par défaut, sans sélection, les demandes sont transmises à tous les validateurs de <strong>{createForm.company === 'Succursale' && createForm.city ? `la Succursale ${createForm.city}` : createForm.company}</strong>. Cochez un ou plusieurs validateurs attitrés :
                    </p>

                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      {potentialValidators.map(val => {
                        const isChecked = createForm.validator_ids.includes(val.id);
                        const valName = val.profile?.full_name || val.display_name || val.username;
                        const valEmail = val.email || val.username;
                        const valComp = val.profile?.company || 'SEFAMAR';
                        const valCity = val.profile?.city || '';

                        return (
                          <label
                            key={val.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.35rem 0.5rem',
                              backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                              border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.82rem'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCreateForm({ ...createForm, validator_ids: [...createForm.validator_ids, val.id] });
                                } else {
                                  setCreateForm({ ...createForm, validator_ids: createForm.validator_ids.filter(id => id !== val.id) });
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{valName}</span>
                                <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.35rem' }}>({valEmail})</span>
                              </div>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: valComp === 'SOMABUS' ? '#b45309' : valComp === 'CKD' ? '#15803d' : valComp === 'SUCCURSALE' ? '#0f766e' : '#0369a1'
                              }}>
                                {valComp === 'SUCCURSALE' && valCity ? `Succursale - ${valCity}` : valComp}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

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
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '8px' }}>
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Modifier l'Utilisateur</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Modification complète des permissions, service et affectation</span>
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Nom & Prénom */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Nom Complet (Nom & Prénom) *</label>
                  <input
                    type="text"
                    placeholder="Ex: Mohamed Alami"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                {/* Adresse Email */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Adresse Email (Identifiant de connexion) *</label>
                  <input
                    type="email"
                    placeholder="Ex: m.alami@sefamar.ma"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem', marginTop: '0.25rem' }}>
                    {COMPANIES.map(comp => (
                      <button
                        type="button"
                        key={comp}
                        onClick={() => {
                          const newCity = comp === 'Succursale' ? (editForm.city || CITIES[0]) : '';
                          setEditForm({ ...editForm, company: comp, city: newCity });
                        }}
                        style={{
                          padding: '0.6rem 0.4rem',
                          borderRadius: '8px',
                          border: editForm.company === comp ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: editForm.company === comp ? '#eff6ff' : '#ffffff',
                          color: editForm.company === comp ? '#1e40af' : '#334155',
                          fontWeight: editForm.company === comp ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          fontSize: '0.82rem'
                        }}
                      >
                        {editForm.company === comp && <Check size={14} />}
                        {comp}
                      </button>
                    ))}
                  </div>

                  {/* Choix de la Ville si Succursale */}
                  {editForm.company === 'Succursale' && (
                    <div style={{ marginTop: '0.65rem', padding: '0.75rem', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px' }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                        <MapPin size={15} />
                        Ville de la Succursale *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.35rem' }}>
                        {CITIES.map(city => {
                          const isSelected = editForm.city === city;
                          return (
                            <button
                              type="button"
                              key={city}
                              onClick={() => setEditForm({ ...editForm, city })}
                              style={{
                                padding: '0.4rem 0.5rem',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                                backgroundColor: isSelected ? '#ccfbf1' : '#ffffff',
                                color: isSelected ? '#0f766e' : '#334155',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              {isSelected && <Check size={12} />}
                              {city}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Service / Département */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Briefcase size={16} />
                      Service / Département
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Optionnel</span>
                  </label>
                  <select
                    value={editForm.departmentSelect}
                    onChange={(e) => setEditForm({ ...editForm, departmentSelect: e.target.value })}
                    className="form-input"
                  >
                    <option value="">-- Aucun service défini (Optionnel) --</option>
                    {STANDARD_DEPARTMENTS.map(d => (
                      <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                    ))}
                    <option value="custom">✏️ Autre service (Saisir manuellement)...</option>
                  </select>

                  {/* Saisie manuelle */}
                  {editForm.departmentSelect === 'custom' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Saisissez le nom du service manuellement..."
                        value={editForm.departmentCustom}
                        onChange={(e) => setEditForm({ ...editForm, departmentCustom: e.target.value })}
                        className="form-input"
                        autoFocus
                      />
                    </div>
                  )}
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

                {/* Affectation selon le rôle */}
                {['validator', 'director'].includes(editForm.role) ? (
                  /* Choix des Demandeurs affectés à ce Validateur (Choix multiple) */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <UserCheck size={16} />
                        Demandeurs Supervisés (Choix de 1 ou plusieurs demandeurs)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                        {editForm.assigned_requester_ids.length} sélectionné(s)
                      </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                      Par défaut, sans sélection, ce validateur reçoit toutes les demandes de la société <strong>{editForm.company}</strong>. Cochez ci-dessous les demandeurs spécifiques à lui affecter (1 ou plusieurs) :
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          const ids = potentialRequesters
                            .filter(r => (r.profile?.company || 'SEFAMAR').toUpperCase() === editForm.company.toUpperCase() && r.id !== editForm.id)
                            .map(r => r.id);
                          setEditForm({ ...editForm, assigned_requester_ids: ids });
                        }}
                      >
                        Tous ceux de {editForm.company}
                      </button>
                      {editForm.company === 'Succursale' && editForm.city && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#0f766e', borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }}
                          onClick={() => {
                            const ids = potentialRequesters
                              .filter(r => (r.profile?.company || '').toUpperCase() === 'SUCCURSALE' && (r.profile?.city || '').toLowerCase() === editForm.city.toLowerCase() && r.id !== editForm.id)
                              .map(r => r.id);
                            setEditForm({ ...editForm, assigned_requester_ids: ids });
                          }}
                        >
                          Demandeurs de {editForm.city}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#64748b' }}
                        onClick={() => setEditForm({ ...editForm, assigned_requester_ids: [] })}
                      >
                        Désélectionner tout
                      </button>
                    </div>

                    <div style={{
                      maxHeight: '170px',
                      overflowY: 'auto',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      {potentialRequesters
                        .filter(r => r.id !== editForm.id)
                        .map(req => {
                          const isChecked = editForm.assigned_requester_ids.includes(req.id);
                          const reqName = req.profile?.full_name || req.display_name || req.username;
                          const reqEmail = req.email || req.username;
                          const reqComp = req.profile?.company || 'SEFAMAR';
                          const reqCity = req.profile?.city || '';
                          const reqDept = req.profile?.department;

                          return (
                            <label
                              key={req.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.35rem 0.5rem',
                                backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                                border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.82rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditForm({ ...editForm, assigned_requester_ids: [...editForm.assigned_requester_ids, req.id] });
                                  } else {
                                    setEditForm({ ...editForm, assigned_requester_ids: editForm.assigned_requester_ids.filter(id => id !== req.id) });
                                  }
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{reqName}</span>
                                  <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.35rem' }}>({reqEmail})</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                  {reqDept && (
                                    <span style={{ fontSize: '0.7rem', padding: '1px 5px', backgroundColor: '#e2e8f0', borderRadius: '4px', color: '#334155' }}>
                                      {reqDept}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: reqComp === 'SOMABUS' ? '#b45309' : reqComp === 'CKD' ? '#15803d' : reqComp === 'SUCCURSALE' ? '#0f766e' : '#0369a1'
                                  }}>
                                    {reqComp === 'SUCCURSALE' && reqCity ? `Succursale - ${reqCity}` : reqComp}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      {potentialRequesters.length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem', textAlign: 'center' }}>
                          Aucun compte demandeur disponible.
                        </span>
                      )}
                    </div>
                  </div>
                ) : editForm.role === 'requester' ? (
                  /* Choix des Validateurs pour ce Demandeur (Choix multiple) */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <UserCheck size={16} />
                        Validateur(s) Attitré(s) (Choix de 1 ou plusieurs)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                        {editForm.validator_ids.length} sélectionné(s)
                      </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                      Par défaut, sans sélection, les demandes sont transmises à tous les validateurs de la société <strong>{editForm.company === 'Succursale' && editForm.city ? `la Succursale ${editForm.city}` : editForm.company}</strong>. Cochez un ou plusieurs validateurs attitrés :
                    </p>

                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      {potentialValidators
                        .filter(v => v.id !== editForm.id)
                        .map(val => {
                          const isChecked = editForm.validator_ids.includes(val.id);
                          const valName = val.profile?.full_name || val.display_name || val.username;
                          const valEmail = val.email || val.username;
                          const valComp = val.profile?.company || 'SEFAMAR';
                          const valCity = val.profile?.city || '';

                          return (
                            <label
                              key={val.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.35rem 0.5rem',
                                backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                                border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.82rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditForm({ ...editForm, validator_ids: [...editForm.validator_ids, val.id] });
                                  } else {
                                    setEditForm({ ...editForm, validator_ids: editForm.validator_ids.filter(id => id !== val.id) });
                                  }
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{valName}</span>
                                  <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.35rem' }}>({valEmail})</span>
                                </div>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: valComp === 'SOMABUS' ? '#b45309' : valComp === 'CKD' ? '#15803d' : valComp === 'SUCCURSALE' ? '#0f766e' : '#0369a1'
                                }}>
                                  {valComp === 'SUCCURSALE' && valCity ? `Succursale - ${valCity}` : valComp}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ) : null}

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
