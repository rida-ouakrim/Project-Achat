import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, Clock, CheckCircle, RefreshCw, Download, UserPlus, Users, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRequests, createUser, fetchUsers, resetUserPassword } from '../api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const KPI = ({ title, value, icon: Icon, color }) => (
  <div className="card flex items-center gap-4" style={{ marginBottom: 0 }}>
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

  // States for creating a new Requester (Moved to Director side)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
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
    if (req.price && (req.status === 'Commandé' || req.status === 'Reçu')) {
      const numericPrice = parseInt(req.price.replace(/[^0-9]/g, '')) || 0;
      return acc + numericPrice;
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
      if (req.supplier && req.price && (req.status === 'Commandé' || req.status === 'Reçu')) {
        const cost = parseInt(req.price.replace(/[^0-9]/g, '')) || 0;
        suppliers[req.supplier] = (suppliers[req.supplier] || 0) + cost;
      }
    });

    return Object.keys(suppliers).map(sup => ({
      name: sup,
      value: suppliers[sup]
    }));
  };

  const dataPie = getSupplierData();

  // Historique complet pour le Directeur (trié du plus récent au plus ancien)
  const allRequestsSorted = [...requests].sort((a, b) => b.id - a.id);

  // Fonction de téléchargement du rapport global CSV pour le DG
  const handleDownloadGlobalReport = () => {
    if (requests.length === 0) {
      alert("Aucune donnée disponible à exporter.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM pour Excel
    csvContent += "Numéro de Commande,Demandeur,Produit,Quantité,Fournisseur,Prix,Statut,Date de Création\n";

    requests.forEach(req => {
      csvContent += `"${req.order_number}","${req.requester_name}","${req.product}",${req.qty},"${req.supplier || ''}","${req.price || ''}","${req.status}","${req.date_created}"\n`;
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
        role: 'requester'
      };
      await createUser(payload);
      setUserSuccessMsg(`Demandeur "${newUsername}" créé avec succès !`);
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
            <KPI title="Total Flux" value={totalRequestsCount} icon={Package} color="#3b82f6" />
            <KPI title="Coût Validé" value={formattedTotalCost} icon={TrendingUp} color="#10b981" />
            <KPI title="En attente" value={pendingRequestsCount} icon={Clock} color="#f59e0b" />
            <KPI title="Commandé / Reçu" value={activeOrdersCount} icon={CheckCircle} color="#3b82f6" />
            <KPI title="Refusé 🚫" value={refusedRequestsCount} icon={TrendingUp} color="#ef4444" />
          </div>

          <div className="flex gap-4 mb-6">
            <div className="card" style={{ flex: 2 }}>
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

            <div className="card" style={{ flex: 1 }}>
              <h3>Répartition Budgétaire Fournisseurs</h3>
              <div style={{ height: '300px', marginTop: '1rem' }}>
                {dataPie.length === 0 ? (
                  <p style={{ textAlign: 'center', paddingTop: '6rem', color: 'var(--color-text-muted)' }}>
                    Aucun fournisseur enregistré pour le moment.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataPie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {dataPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString('fr-FR')} MAD`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
            <div className="card" style={{ flex: 2, marginBottom: 0 }}>
              <h3>Toutes les Demandes & Commandes</h3>
              <div className="table-container mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                    <tr>
                      <th>N° Commande</th>
                      <th>Date</th>
                      <th>Demandeur</th>
                      <th>Produit</th>
                      <th>Coût / Fournisseur</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRequestsSorted.map(order => (
                      <tr key={order.id}>
                        <td style={{ fontWeight: 500 }}>{order.order_number}</td>
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
                          <span className={`badge badge-${
                            order.status === 'Commandé' ? 'ordered' : 
                            order.status === 'Reçu' ? 'received' : 
                            order.status === 'En attente' ? 'pending' : 'rejected'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {allRequestsSorted.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          Aucune donnée d'achat enregistrée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Barre latérale droite du Directeur (Formulaire + Liste des Utilisateurs) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Créer un Demandeur */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-primary)' }}>
                  <UserPlus size={20} />
                  <h3 style={{ margin: 0 }}>Créer un Demandeur</h3>
                </div>
                <p className="text-xs text-muted mb-4">Ajouter un nouveau compte de demandeur à l'application.</p>
                
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
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Nom d'utilisateur</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ex: ali_new" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      disabled={creatingUser}
                    />
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
              <div className="card" style={{ marginBottom: 0 }}>
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
                            u.profile?.role === 'purchasing' ? 'ordered' : 'received'
                          }`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                            {u.profile?.role === 'requester' ? 'Demandeur' : 
                             u.profile?.role === 'purchasing' ? 'Acheteur' : 'Directeur'}
                          </span>
                          {/* Ne pas permettre au DG de réinitialiser le mot de passe du DG lui-même pour éviter les erreurs ? Optionnel, mais ici c'est ouvert pour tout le monde sauf le current user si on voulait. On laisse ouvert. */}
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
    </div>
  );
};

export default DirectorDashboard;
