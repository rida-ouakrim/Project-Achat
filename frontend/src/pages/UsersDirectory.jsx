import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Filter, Shield, Eye, Building2, Briefcase, MapPin,
  UserCheck, RefreshCw, X, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchUsers } from '../api';

const COMPANIES = ['SEFAMAR', 'SOMABUS', 'CKD', 'Succursale'];

const STANDARD_DEPARTMENTS = [
  { value: 'Magasinier', label: 'Magasinier (Pièces & Stock)' },
  { value: 'Atelier', label: 'Atelier (SAV & Maintenance)' },
  { value: 'ADV', label: 'ADV (Administration Des Ventes)' },
  { value: 'Commercial', label: 'Commercial / Ventes' },
  { value: 'Comptabilité', label: 'Comptabilité / Finance' },
  { value: 'Informatique', label: 'Informatique / IT' },
  { value: 'Moyens Généraux', label: 'Moyens Généraux' },
  { value: 'Direction', label: 'Direction Générale' }
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

const UsersDirectory = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('Tous');
  const [roleFilter, setRoleFilter] = useState('Tous');
  const [departmentFilter, setDepartmentFilter] = useState('Tous');

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

  // Liste unique des départements
  const allDepartmentsList = useMemo(() => {
    const list = new Set(STANDARD_DEPARTMENTS.map(d => d.value));
    users.forEach(u => {
      if (u.profile?.department && u.profile.department.trim()) {
        list.add(u.profile.department.trim());
      }
    });
    return Array.from(list);
  }, [users]);

  // Filtrage
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

  // Statistiques globales
  const stats = useMemo(() => {
    const total = users.length;
    const sefamar = users.filter(u => (u.profile?.company || 'SEFAMAR').toUpperCase() === 'SEFAMAR').length;
    const somabus = users.filter(u => (u.profile?.company || '').toUpperCase() === 'SOMABUS').length;
    const ckd = users.filter(u => (u.profile?.company || '').toUpperCase() === 'CKD').length;
    const succursales = users.filter(u => (u.profile?.company || '').toUpperCase() === 'SUCCURSALE').length;
    const withValidator = users.filter(u => u.profile?.validator_name || (u.profile?.validator_ids && u.profile.validator_ids.length > 0)).length;
    return { total, sefamar, somabus, ckd, succursales, withValidator };
  }, [users]);

  return (
    <div style={{ padding: '0.75rem 0.5rem 2rem 0.5rem', width: '100%', margin: '0 auto' }}>

      {/* En-tête de la page */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563eb', display: 'flex' }}>
              <Users size={24} />
            </div>
            Annuaire des Utilisateurs & Affectations
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Consultez les collaborateurs, leurs services, leurs entreprises et leurs validateurs attitrés en lecture seule.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            border: '1px solid #cbd5e1'
          }}>
            <Eye size={15} style={{ color: '#2563eb' }} />
            Mode Consultation (Lecture seule)
          </div>

          <button
            onClick={loadData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem' }}
            title="Rafraîchir les données"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Cartes KPI Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL UTILISATEURS</span>
            <Users size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Comptes actifs</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>SEFAMAR</span>
            <Building2 size={18} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0369a1' }}>{stats.sefamar}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Siège SEFAMAR</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>SOMABUS</span>
            <Building2 size={18} style={{ color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#b45309' }}>{stats.somabus}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Comptes SOMABUS</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>CKD</span>
            <Building2 size={18} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#15803d' }}>{stats.ckd}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Comptes CKD</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>SUCCURSALES</span>
            <MapPin size={18} style={{ color: '#0d9488' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f766e' }}>{stats.succursales}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Branches régionales</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>VALIDATEURS DÉDIÉS</span>
            <UserCheck size={18} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#166534' }}>{stats.withValidator}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Affectations renseignées</div>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div style={{ backgroundColor: '#ffffff', padding: '0.9rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, service, validateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.85rem' }}
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

          {/* Filtre Service */}
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

      {/* Tableau de consultation en lecture seule */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
            Chargement de l'annuaire des utilisateurs...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <Users size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem auto' }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Aucun utilisateur trouvé</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Essayez d'ajuster votre recherche ou vos filtres.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '940px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em' }}>UTILISATEUR (NOM & EMAIL)</th>
                  <th style={{ padding: '0.75rem 0.6rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>ENTREPRISE</th>
                  <th style={{ padding: '0.75rem 0.6rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>SERVICE / DÉPARTEMENT</th>
                  <th style={{ padding: '0.75rem 0.6rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>RÔLE MÉTIER</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em' }}>VALIDATEUR ATTITRÉ / DEMANDEURS</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>DEMANDES</th>
                  <th style={{ padding: '0.75rem 0.6rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>DATE CRÉATION</th>
                  <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>STATUT</th>
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
                  const fullName = u.profile?.full_name || u.display_name || ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username;
                  const emailAddress = u.email || u.username;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>

                      {/* Utilisateur (Nom + Email) */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
                            fontSize: '0.85rem',
                            border: '1px solid #bfdbfe',
                            flexShrink: 0
                          }}>
                            {(fullName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                              {fullName}
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
                      <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
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
                      <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
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
                      <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
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
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {role === 'validator' || role === 'director' ? (
                          (u.profile?.assigned_requester_ids && u.profile.assigned_requester_ids.length > 0) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d', fontSize: '0.82rem', fontWeight: 600 }}>
                              <UserCheck size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
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
                              <UserCheck size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
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
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.55rem',
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
                      <td style={{ padding: '0.75rem 0.6rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {u.date_joined || '-'}
                      </td>

                      {/* Statut du compte (Lecture seule) */}
                      <td style={{ padding: '0.75rem 0.6rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {u.is_active !== false ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0'
                          }}>
                            <CheckCircle2 size={12} />
                            Actif
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca'
                          }}>
                            <AlertCircle size={12} />
                            Inactif
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default UsersDirectory;
