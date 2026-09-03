import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, Clock, CheckCircle, RefreshCw, Download, UserPlus, Users, Key, FileText, Eye, X } from 'lucide-react';

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendBase = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '';
  return backendBase + path;
};
import toast from 'react-hot-toast';
import { fetchRequests, createUser, fetchUsers, resetUserPassword } from '../api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const KPI = ({ title, value, icon: Icon, color, bgClass }) => (
  <div className={`card flex items-center gap-4 ${bgClass || ''}`} style={{ marginBottom: 0 }}>
    <div style={{ backgroundColor: `${color}20`, padding: '1rem', borderRadius: 'var(--radius-lg)', color: color }}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-muted">{title}</p>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</h3>
    </div>
  </div>
);

const DirectorDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState('');

  // States for filtering the main table
  const [filterDate, setFilterDate] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('Tous');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [filterProduct, setFilterProduct] = useState('');

  // States for request details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState(null);

  // States for creating a new Requester (Moved to Director side)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('requester');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');
  const [userErrorMsg, setUserErrorMsg] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  
  // States for Custom Password Reset Modal
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassValue, setNewPassValue] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setUsersLoading(true);
    try {
      const response = await fetchRequests();
      setRequests(response.data);

      const usersResponse = await fetchUsers();
      setUsers(usersResponse.data);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les indicateurs analytiques.");
    } finally {
      setLoading(false);
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculs dynamiques
  const totalRequestsCount = requests.length;
  const pendingRequestsCount = requests.filter(req => req.status === 'En attente').length;
  const completedRequestsCount = requests.filter(req => req.status === 'Reçu').length;
  const refusedRequestsCount = requests.filter(req => req.status === 'Refusé').length;
  const activeOrdersCount = requests.filter(req => req.status === 'Commandé' || req.status === 'Reçu').length;

  const totalCost = requests.reduce((acc, req) => {
    if (req.items && (req.status === 'Commandé' || req.status === 'Reçu')) {
      const orderTotal = req.items.reduce((sum, item) => {
        if (item.price) {
          const unitPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
          const qty = parseInt(item.qty, 10) || 1;
          return sum + (unitPrice * qty);
        }
        return sum;
      }, 0);
      return acc + orderTotal;
    }
    return acc;
  }, 0);

  // Formater le coût total pour l'affichage (ex: 15 000 MAD)
  const formattedTotalCost = `${totalCost.toLocaleString('fr-FR')} MAD`;

  // Préparer les données pour le graphique en barre (Commandes par mois)
  const getMonthlyData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const counts = Array(12).fill(0);
    
    requests.forEach(req => {
      if (req.date_created) {
        const monthIndex = new Date(req.date_created).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          counts[monthIndex] += 1;
        }
      }
    });

    const data = months.map((m, i) => ({ name: m, Commandes: counts[i] }));
    const currentMonth = new Date().getMonth();
    return data.slice(Math.max(0, currentMonth - 4), currentMonth + 1);
  };

  const dataBar = getMonthlyData();

  // Préparer les données pour le graphique circulaire (Répartition Fournisseurs par coût cumulé)
  const getSupplierData = () => {
    const suppliers = {};
    requests.forEach(req => {
      if (req.items && (req.status === 'Commandé' || req.status === 'Reçu')) {
        req.items.forEach(it => {
          if (it.supplier && it.price) {
            const unitPrice = parseFloat(it.price.replace(/[^0-9.]/g, '')) || 0;
            const qty = parseInt(it.qty, 10) || 1;
            const total = unitPrice * qty;
            // Normaliser le nom du fournisseur (sans espaces superflus, en majuscules) pour éviter les doublons
            const normSupplier = it.supplier.trim().toUpperCase();
            suppliers[normSupplier] = (suppliers[normSupplier] || 0) + total;
          }
        });
      }
    });

    const sorted = Object.keys(suppliers)
      .map(sup => ({ name: sup, value: suppliers[sup] }))
      .sort((a, b) => b.value - a.value);

    // Conserver les 5 plus grands fournisseurs et regrouper les autres sous "AUTRES"
    if (sorted.length > 5) {
      const top5 = sorted.slice(0, 5);
      const others = sorted.slice(5);
      const othersValue = others.reduce((sum, item) => sum + item.value, 0);
      if (othersValue > 0) {
        top5.push({ name: `AUTRES (${others.length})`, value: othersValue });
      }
      return top5;
    }

    return sorted;
  };

  const dataPie = getSupplierData();

  // Historique complet pour le Directeur (trié du plus récent au plus ancien)
  const allRequestsSorted = [...requests].sort((a, b) => b.id - a.id);

  // Dynamic lists of unique assignments for filtering
  const uniqueAssignments = Array.from(
    new Set(
      requests
        .map(req => req.assignment)
        .filter(assign => assign && assign.trim() !== '')
    )
  ).sort();

  // Filtered requests based on filter selections
  const filteredRequests = allRequestsSorted.filter(req => {
    if (filterDate && req.date_created !== filterDate) return false;
    if (filterAssignment !== 'Tous' && req.assignment !== filterAssignment) return false;
    if (filterStatus !== 'Tous' && req.status !== filterStatus) return false;
    if (filterProduct.trim() !== '') {
      const searchLower = filterProduct.toLowerCase();
      const hasProduct = req.items && req.items.some(item => 
        item.product.toLowerCase().includes(searchLower)
      );
      if (!hasProduct) return false;
    }
    return true;
  });

  // Fonction de téléchargement du rapport global CSV pour le DG
  const handleDownloadGlobalReport = () => {
    if (requests.length === 0) {
      alert("Aucune donnée disponible à exporter.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM pour Excel
    csvContent += "Numéro de Commande,Demandeur,Produit,Quantité,Fournisseur,Prix Unitaire,Montant Total,Statut,Date de Création\n";

    requests.forEach(req => {
      if (req.items && req.items.length > 0) {
        req.items.forEach(it => {
          const unitPrice = parseFloat((it.price || '0').replace(/[^0-9.]/g, '')) || 0;
          const total = unitPrice * (parseInt(it.qty, 10) || 1);
          csvContent += `"${req.order_number}","${req.requester_name}","${it.product}",${it.qty},"${req.supplier || ''}","${it.price || ''}","${total} MAD","${req.status}","${req.date_created}"\n`;
        });
      } else {
        csvContent += `"${req.order_number}","${req.requester_name}","","","","","","${req.status}","${req.date_created}"\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rapport_Global_MAN_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fonction de création de nouveau demandeur par le DG
  const handleCreateRequester = async (e) => {
    e.preventDefault();
    setUserSuccessMsg('');
    setUserErrorMsg('');
    setCreatingUser(true);

    try {
      const payload = {
        username: newUsername.trim(),
        password: newPassword,
        role: newUserRole
      };
      await createUser(payload);
      setUserSuccessMsg(`Utilisateur "${newUsername}" créé avec succès !`);
      setNewUsername('');
      setNewPassword('');
      
      // Actualiser la liste des utilisateurs après création
      const usersResponse = await fetchUsers();
      setUsers(usersResponse.data);
    } catch (err) {
      console.error(err);
      setUserErrorMsg(err.response?.data?.error || "Erreur de création de l'utilisateur.");
    } finally {
      setCreatingUser(false);
    }
  };

  const openPasswordResetModal = (user) => {
    setResettingUser(user);
    setNewPassValue('');
    setIsResetModalOpen(true);
  };

  const handleConfirmPasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassValue.trim() || !resettingUser) return;
    
    try {
      await resetUserPassword(resettingUser.id, newPassValue.trim());
      toast.success(`Mot de passe mis à jour avec succès !`);
      setIsResetModalOpen(false);
      setResettingUser(null);
    } catch (err) {
      console.error(err);
      toast.error("Échec de la modification du mot de passe.");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2>Tableau de Bord Direction</h2>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={handleDownloadGlobalReport} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} />
            Rapport Global (CSV)
          </button>
          <button className="btn btn-outline" onClick={loadData} title="Actualiser" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem',
          borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>Mise à jour des analyses en cours...</p>
      ) : (
        <>
          <div className="kpi-grid">
            <KPI title="Total Flux" value={totalRequestsCount} icon={Package} color="#3b82f6" bgClass="card-soft-blue" />
            <KPI title="Coût Validé" value={formattedTotalCost} icon={TrendingUp} color="#10b981" bgClass="card-soft-green" />
            <KPI title="En attente" value={pendingRequestsCount} icon={Clock} color="#f59e0b" bgClass="card-soft-amber" />
            <KPI title="Commandé / Reçu" value={activeOrdersCount} icon={CheckCircle} color="#3b82f6" bgClass="card-soft-blue" />
            <KPI title="Refusé 🚫" value={refusedRequestsCount} icon={TrendingUp} color="#ef4444" bgClass="card-soft-red" />
          </div>

          <div className="flex gap-4 mb-6">
            <div className="card accent-primary" style={{ flex: 2 }}>
              <h3>Commandes réelles par Mois</h3>
              <div style={{ height: '300px', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataBar}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="Commandes" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card accent-primary" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3>Répartition Budgétaire Fournisseurs</h3>
              {dataPie.length === 0 ? (
                <p style={{ textAlign: 'center', paddingTop: '6rem', color: 'var(--color-text-muted)' }}>
                  Aucun fournisseur enregistré pour le moment.
                </p>
              ) : (
                <div style={{ height: '300px', marginTop: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, minHeight: '170px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dataPie} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                          {dataPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString('fr-FR')} MAD`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Légende personnalisée scrollable et élégante */}
                  <div style={{
                    maxHeight: '115px',
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.35rem 0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.725rem',
                    border: '1px solid var(--color-border)',
                    marginTop: '0.25rem'
                  }}>
                    {dataPie.map((entry, index) => {
                      const totalVal = dataPie.reduce((s, d) => s + d.value, 0);
                      const percent = totalVal > 0 ? Math.round((entry.value / totalVal) * 100) : 0;
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', whiteSpace: 'nowrap' }} title={`${entry.name}: ${entry.value.toLocaleString('fr-FR')} MAD (${percent}%)`}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>{entry.name}</span>
                          <span style={{ color: 'var(--color-text-muted)', marginLeft: 'auto', fontSize: '0.675rem', fontWeight: 500 }}>{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card accent-primary" style={{ width: '100%', marginBottom: '1.5rem' }}>
            <h3>Toutes les Demandes & Commandes</h3>

            {/* Filter controls row */}
            <div className="flex gap-4 mt-4 mb-4 flex-wrap" style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '1rem', 
              marginBottom: '1.5rem', 
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              padding: '1rem',
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)'
            }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                  Filtrer par Date
                </label>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', width: '100%' }}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                  Filtrer par Affectation
                </label>
                <select 
                  className="form-input" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', width: '100%', backgroundColor: 'white' }}
                  value={filterAssignment}
                  onChange={(e) => setFilterAssignment(e.target.value)}
                >
                  <option value="Tous">Toutes les affectations</option>
                  {uniqueAssignments.map((assign, idx) => (
                    <option key={idx} value={assign}>{assign}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                  Filtrer par Statut
                </label>
                <select 
                  className="form-input" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', width: '100%', backgroundColor: 'white' }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="Tous">Tous les statuts</option>
                  <option value="En attente">En attente</option>
                  <option value="Commandé">Commandé</option>
                  <option value="Reçu">Reçu</option>
                  <option value="Refusé">Refusé</option>
                </select>
              </div>

              <div style={{ flex: 1.5, minWidth: '200px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                  Rechercher un produit
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Extincteur, Filtre..." 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', width: '100%' }}
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                />
              </div>

              <button 
                className="btn btn-outline" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', height: '36px' }}
                onClick={() => {
                  setFilterDate('');
                  setFilterAssignment('Tous');
                  setFilterStatus('Tous');
                  setFilterProduct('');
                }}
              >
                Réinitialiser
              </button>
            </div>

            <div className="table-container mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table">
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <tr>
                    <th>N° Commande</th>
                    <th>Date</th>
                    <th>Demandeur</th>
                    <th>Produit</th>
                    <th>Affectation</th>
                    <th>Coût / Fournisseur</th>
                    <th>Validation</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'center' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div>{order.order_number}</div>
                        {order.request_pdf && (
                          <a 
                            href={getMediaUrl(order.request_pdf)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 mt-1 text-xs text-blue-600 hover:underline"
                            style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}
                          >
                            <FileText size={12} />
                            <span>Dossier PDF</span>
                          </a>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {order.date_created ? (() => {
                           const parts = order.date_created.split('-');
                           return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : order.date_created;
                        })() : '-'}
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{order.requester_name}</td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                          {order.items && order.items.map((it, idx) => (
                            <li key={idx}>
                              <div style={{ fontWeight: 500 }}>{it.product}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Qté: {it.qty}</div>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ fontSize: '0.875rem', maxWidth: '150px', wordBreak: 'break-all' }}>{order.assignment || '-'}</td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                          {order.items && order.items.map((it, idx) => (
                            <li key={idx}>
                              {it.price ? (
                                <div>
                                  <div style={{ fontWeight: 600 }}>{it.price}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{it.supplier}</div>
                                </div>
                              ) : (
                                <span style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '0.75rem' }}>Non renseigné</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        {order.is_validated ? (
                          <span className="badge" style={{ 
                            backgroundColor: '#dcfce7', 
                            color: '#15803d', 
                            border: '1px solid #bbf7d0',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            Validé ({order.validated_by_name === 'man@sefamar.ma' ? 'Mme EL MANSOURI' : order.validated_by_name === 'chadi@sefamar.ma' ? 'Chadi' : order.validated_by_name === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' : order.validated_by_name})
                          </span>
                        ) : (
                          <span className="badge" style={{ 
                            backgroundColor: '#fee2e2', 
                            color: '#b91c1c', 
                            border: '1px solid #fecaca',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            Non validé
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${
                          order.status === 'Commandé' ? 'ordered' : 
                          order.status === 'Reçu' ? 'received' : 
                          order.status === 'En attente' ? 'pending' : 'rejected'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem' }} 
                          onClick={() => {
                            setDetailsRequest(order);
                            setIsDetailsModalOpen(true);
                          }}
                          title="Voir les détails"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        Aucune demande ne correspond à ces critères de recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4" style={{ alignItems: 'flex-start', width: '100%' }}>
            {/* Créer un Utilisateur */}
            <div className="card accent-success" style={{ flex: 1, marginBottom: 0 }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-primary)' }}>
                <UserPlus size={20} />
                <h3 style={{ margin: 0 }}>Créer un Utilisateur</h3>
              </div>
              <p className="text-xs text-muted mb-4">Ajouter un nouveau compte utilisateur à la plateforme.</p>
              
              {userSuccessMsg && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', backgroundColor: '#ecfdf5', padding: '0.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  {userSuccessMsg}
                </p>
              )}
              {userErrorMsg && (
                <p style={{ fontSize: '0.75rem', color: 'red', backgroundColor: '#fff5f5', padding: '0.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  {userErrorMsg}
                </p>
              )}

              <form onSubmit={handleCreateRequester}>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Nom d'utilisateur (Email / Identifiant)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: Ahmed@sefacar.ma" 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    disabled={creatingUser}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Rôle & Accès</label>
                  <select 
                    className="form-input" 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', backgroundColor: 'white' }}
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    disabled={creatingUser}
                  >
                    <option value="requester">Demandeur (MAN)</option>
                    <option value="purchasing">Acheteur (SEFAMAR)</option>
                    <option value="ai_tools">Outils IA Uniquement (Filiale SEFACAR)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Mot de passe</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={creatingUser}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-outline w-full" 
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.8125rem', backgroundColor: 'var(--color-bg)' }}
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Création...' : 'Créer le Compte'}
                </button>
              </form>
            </div>

            {/* Utilisateurs Enregistrés */}
            <div className="card accent-primary" style={{ flex: 1, marginBottom: 0 }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-primary)' }}>
                <Users size={20} />
                <h3 style={{ margin: 0 }}>Utilisateurs Enregistrés</h3>
              </div>
              <p className="text-xs text-muted mb-4">Membres ayant accès à la plateforme.</p>
              
              {usersLoading ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                  Chargement...
                </p>
              ) : (
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
                  {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center" style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{u.username}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge badge-${
                          u.profile?.role === 'requester' ? 'pending' : 
                          u.profile?.role === 'purchasing' ? 'ordered' : 
                          u.profile?.role === 'ai_tools' ? 'pending' : 'received'
                        }`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                          {u.profile?.role === 'requester' ? 'Demandeur' : 
                           u.profile?.role === 'purchasing' ? 'Acheteur' : 
                           u.profile?.role === 'ai_tools' ? 'Outils IA (Filiale)' : 'Directeur'}
                        </span>
                        <button 
                          onClick={() => openPasswordResetModal(u)} 
                          title="Réinitialiser le Mot de passe"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '2px' }}
                        >
                          <Key size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      Aucun utilisateur trouvé.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Custom Password Reset Modal */}
      {isResetModalOpen && resettingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                  <Key size={20} />
                </div>
                <h3 style={{ margin: 0 }}>Réinitialiser Mot de Passe</h3>
              </div>
              <button className="btn btn-outline" onClick={() => setIsResetModalOpen(false)} style={{ padding: '0.25rem', border: 'none', fontSize: '1.5rem', lineHeight: 1 }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleConfirmPasswordReset}>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Définissez un nouveau mot de passe sécurisé pour l'utilisateur <strong>{resettingUser.username}</strong>.
              </p>
              
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Entrez le nouveau mot de passe..."
                  value={newPassValue}
                  onChange={(e) => setNewPassValue(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-outline" onClick={() => setIsResetModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Détails de la demande */}
      {isDetailsModalOpen && detailsRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Détails de la Demande ({detailsRequest.order_number})</h3>
              <button className="btn btn-outline" onClick={() => setIsDetailsModalOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <div className="grid grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p className="text-xs text-muted">Demandeur</p>
                  <p style={{ fontWeight: 600 }}>{detailsRequest.requester_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Affectation</p>
                  <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{detailsRequest.assignment || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Date de Création</p>
                  <p style={{ fontWeight: 600 }}>{detailsRequest.date_created}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Validation</p>
                  <div style={{ marginTop: '0.25rem' }}>
                    {detailsRequest.is_validated ? (
                      <span className="badge" style={{ 
                        backgroundColor: '#dcfce7', 
                        color: '#15803d', 
                        border: '1px solid #bbf7d0',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Validé ({detailsRequest.validated_by_name === 'man@sefamar.ma' ? 'Mme EL MANSOURI' : detailsRequest.validated_by_name === 'chadi@sefamar.ma' ? 'Chadi' : detailsRequest.validated_by_name === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' : detailsRequest.validated_by_name})
                      </span>
                    ) : (
                      <span className="badge" style={{ 
                        backgroundColor: '#fee2e2', 
                        color: '#b91c1c', 
                        border: '1px solid #fecaca',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Non validé
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted">Statut</p>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className={`badge badge-${
                      detailsRequest.status === 'En attente' ? 'pending' : 
                      detailsRequest.status === 'Approuvé' ? 'approved' : 
                      detailsRequest.status === 'Commandé' ? 'ordered' : 
                      detailsRequest.status === 'Reçu' ? 'received' : 'rejected'
                    }`}>
                      {detailsRequest.status}
                    </span>
                  </div>
                </div>
              </div>

              {detailsRequest.request_pdf && (
                <div style={{ backgroundColor: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs text-muted mb-1">Document de Demande Joint</p>
                  <a 
                    href={getMediaUrl(detailsRequest.request_pdf)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                    style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
                  >
                    <FileText size={16} />
                    <span>Visualiser la demande PDF / Image</span>
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs text-muted mb-2">Articles commandés & Coûts</p>
                <div className="table-container">
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th style={{ textAlign: 'center' }}>Quantité</th>
                        <th>Fournisseur</th>
                        <th style={{ textAlign: 'right' }}>Prix Unitaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsRequest.items && detailsRequest.items.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{it.product}</td>
                          <td style={{ textAlign: 'center' }}>{it.qty}</td>
                          <td>{it.supplier || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>Non renseigné</span>}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{it.price || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {detailsRequest.observation && (
                <div>
                  <p className="text-xs text-muted mb-1">Observation</p>
                  <div style={{ 
                    backgroundColor: 'var(--color-bg)', 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--color-border)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {detailsRequest.observation}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button className="btn btn-outline" onClick={() => setIsDetailsModalOpen(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorDashboard;
