import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, Clock, CheckCircle, RefreshCw, Download, FileText, Eye, X, Activity, AlertCircle, ShoppingCart } from 'lucide-react';

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendBase = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '';
  return backendBase + path;
};
import toast from 'react-hot-toast';
import { fetchRequests } from '../api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const DirectorDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // States for filtering the main table
  const [filterDate, setFilterDate] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('Tous');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [filterCompany, setFilterCompany] = useState('Tous');
  const [filterProduct, setFilterProduct] = useState('');

  // States for request details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetchRequests();
      setRequests(response.data || []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les indicateurs analytiques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculs dynamiques
  const totalRequestsCount = requests.length;

  // Demandes pas encore commandées (Statut 'En attente' / non traitées par les achats)
  const notOrderedRequests = requests.filter(req => req.status === 'En attente' || (!['Commandé', 'Reçu', 'Refusé'].includes(req.status)));
  const notOrderedCount = notOrderedRequests.length;
  const validatedReadyCount = notOrderedRequests.filter(req => req.is_validated).length;
  const pendingValidationCount = notOrderedRequests.filter(req => !req.is_validated).length;

  const validatedTotalCount = requests.filter(req => req.is_validated).length;
  const completedRequestsCount = requests.filter(req => req.status === 'Reçu').length;
  const refusedRequestsCount = requests.filter(req => req.status === 'Refusé').length;
  const activeOrdersCount = requests.filter(req => req.status === 'Commandé' || req.status === 'Reçu').length;

  // Estimation dynamique de demandes par jour dans l'application
  const dailyEstimation = useMemo(() => {
    if (!requests || requests.length === 0) {
      return { avgGlobal: '0.0', avgLast30Days: '0.0', totalDays: 1, recentCount: 0 };
    }
    const timestamps = requests
      .map(r => r.date_created ? new Date(r.date_created).getTime() : null)
      .filter(t => t && !isNaN(t));

    if (timestamps.length === 0) {
      return { avgGlobal: '0.0', avgLast30Days: '0.0', totalDays: 1, recentCount: 0 };
    }

    const minTime = Math.min(...timestamps);
    const nowTime = new Date().getTime();
    const diffDays = Math.max(1, Math.round((nowTime - minTime) / (1000 * 60 * 60 * 24)));
    const avgGlobal = (requests.length / diffDays).toFixed(1);

    // Activité des 30 derniers jours
    const thirtyDaysAgo = nowTime - (30 * 24 * 60 * 60 * 1000);
    const recentRequests = requests.filter(r => r.date_created && new Date(r.date_created).getTime() >= thirtyDaysAgo);
    const avgLast30Days = (recentRequests.length / 30).toFixed(1);

    const displayRate = parseFloat(avgLast30Days) > 0 ? avgLast30Days : avgGlobal;

    return {
      avgGlobal,
      avgLast30Days: displayRate,
      totalDays: diffDays,
      recentCount: recentRequests.length
    };
  }, [requests]);

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
    if (filterCompany !== 'Tous') {
      const comp = (req.company || req.requester_company || 'SEFAMAR').toUpperCase();
      if (comp !== filterCompany.toUpperCase()) return false;
    }
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0' }}>Tableau de Bord Direction & DAF</h2>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            Supervision analytique des demandes d'achat, des engagements budgétaires et du flux quotidien.
          </p>
        </div>
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
          {/* Grille des KPIs - Demandes, Non Commandées, Estimation Dynamique, etc. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            
            {/* Total Demandes */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6', marginBottom: 0 }}>
              <div style={{ backgroundColor: '#3b82f615', color: '#3b82f6', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <Package size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0, fontWeight: 600 }}>Total Demandes</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{totalRequestsCount}</h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Flux global créé</span>
              </div>
            </div>

            {/* Pas encore commandées */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b', marginBottom: 0 }}>
              <div style={{ backgroundColor: '#f59e0b15', color: '#d97706', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <Clock size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0, fontWeight: 600 }}>Non Commandées</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#d97706' }}>{notOrderedCount}</h3>
                <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 500 }}>
                  {validatedReadyCount} validée(s) prête(s) • {pendingValidationCount} à valider
                </span>
              </div>
            </div>

            {/* Validées & Prêtes */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981', marginBottom: 0 }}>
              <div style={{ backgroundColor: '#10b98115', color: '#10b981', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <CheckCircle size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0, fontWeight: 600 }}>Validées & Prêtes</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#10b981' }}>{validatedTotalCount}</h3>
                <span style={{ fontSize: '0.72rem', color: '#15803d' }}>Approuvées Direction</span>
              </div>
            </div>

            {/* Commandées / Reçues */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #8b5cf6', marginBottom: 0 }}>
              <div style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <ShoppingCart size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0, fontWeight: 600 }}>Commandées / Reçues</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#7c3aed' }}>{activeOrdersCount}</h3>
                <span style={{ fontSize: '0.72rem', color: '#6d28d9' }}>{completedRequestsCount} reçue(s) en stock</span>
              </div>
            </div>

            {/* Estimation demandes par jour (DYNAMIQUE) */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #0d9488', marginBottom: 0 }}>
              <div style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <Activity size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0, fontWeight: 600 }}>Rythme / Jour (Dynamique)</p>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#0f766e' }}>
                  ~ {dailyEstimation.avgLast30Days} <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>dem./j</span>
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#0f766e' }}>
                  Moy. globale : {dailyEstimation.avgGlobal}/j ({dailyEstimation.recentCount} dem. / 30j)
                </span>
              </div>
            </div>

            {/* Volume Total Achats */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444', marginBottom: 0 }}>
              <div style={{ backgroundColor: '#ef444415', color: '#ef4444', padding: '0.9rem', borderRadius: 'var(--radius-lg)' }}>
                <TrendingUp size={26} />
              </div>
              <div>
                <p className="text-sm text-muted" style={{ margin: 0, fontWeight: 600 }}>Volume Total Achats</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#b91c1c' }}>
                  {totalCost.toLocaleString('fr-FR')} <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>MAD</span>
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Commandes validées</span>
              </div>
            </div>

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
                  Filtrer par Entreprise
                </label>
                <select 
                  className="form-input" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', width: '100%', backgroundColor: 'white' }}
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                >
                  <option value="Tous">Toutes les entreprises</option>
                  <option value="SEFAMAR">SEFAMAR</option>
                  <option value="SOMABUS">SOMABUS</option>
                  <option value="CKD">CKD</option>
                </select>
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
                  setFilterCompany('Tous');
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
                    <th>Entreprise</th>
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
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {(() => {
                          const comp = (order.company || order.requester_company || 'SEFAMAR').toUpperCase();
                          const style = comp === 'SOMABUS' 
                            ? { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }
                            : comp === 'CKD'
                            ? { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }
                            : { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
                          return (
                            <span style={{ ...style, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              {comp}
                            </span>
                          );
                        })()}
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
                            Validé ({order.validated_by_name === 'man@sefamar.ma' ? 'Mme EL MANSOURI' : order.validated_by_name === 'chadi@sefamar.ma' ? 'Chadi' : order.validated_by_name === 'obelkadi.man@sefamar.ma' ? 'O. BELKADI (Commercial)' : order.validated_by_name === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' : order.validated_by_name})
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
        </>
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
                        Validé ({detailsRequest.validated_by_name === 'man@sefamar.ma' ? 'Mme EL MANSOURI' : detailsRequest.validated_by_name === 'chadi@sefamar.ma' ? 'Chadi' : detailsRequest.validated_by_name === 'obelkadi.man@sefamar.ma' ? 'O. BELKADI (Commercial)' : detailsRequest.validated_by_name === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' : detailsRequest.validated_by_name})
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
