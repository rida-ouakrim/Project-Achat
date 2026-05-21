import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Globe, Phone, Building, History, ArrowLeft, Calendar, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import API, { fetchSourcingHistory, deleteSourcingHistory } from '../api';

const SourcingDashboard = () => {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'history'
  const [product, setProduct] = useState('');
  const [location, setLocation] = useState('Casablanca');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // States for History feature
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // States for Progress Bar Loader
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  // Handle dynamic progress bar logic
  useEffect(() => {
    if (loading) {
      setProgress(0);
      // Start dynamic interval: fast at first, then slowing down
      progressIntervalRef.current = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 98) return 98; // Cap it below 100
          
          // Decay function: steps get smaller as it gets higher
          const diff = 100 - prevProgress;
          const step = Math.max(1, Math.floor(diff * 0.08)); // Smooth slowing
          return prevProgress + step;
        });
      }, 1200); // Every 1.2s
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (progress > 0) {
        setProgress(100);
        // Reset progress after a brief moment so it looks like it finished
        const t = setTimeout(() => setProgress(0), 800);
        return () => clearTimeout(t);
      }
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [loading]);

  // Load history list
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetchSourcingHistory();
      setHistoryList(response.data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
      toast.error("Impossible de charger l'historique.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation(); // Évite le clic sur la ligne de déclencher la sélection de l'historique
    
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette recherche de l'historique ?")) {
      const toastId = toast.loading("Suppression en cours...");
      try {
        await deleteSourcingHistory(id);
        toast.success("Recherche supprimée avec succès !", { id: toastId });
        
        // Si la recherche supprimée était sélectionnée, vider la sélection
        if (selectedHistoryItem?.id === id) {
          setSelectedHistoryItem(null);
        }
        
        // Recharger l'historique
        loadHistory();
      } catch (err) {
        console.error("Error deleting history:", err);
        toast.error("Impossible de supprimer cette recherche.", { id: toastId });
      }
    }
  };

  // Fetch history on tab click
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
      setSelectedHistoryItem(null);
    }
  }, [activeTab]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!product.trim()) {
      return toast.error("Veuillez entrer un produit à chercher.");
    }

    setLoading(true);
    setResults(null);
    try {
      const response = await API.post('ai/sourcing/', { product, location });
      if (response.data.success) {
        setResults(response.data.data);
        toast.success("Recherche terminée avec succès !");
      } else {
        toast.error("Erreur de l'IA: " + response.data.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Échec de la connexion à l'assistant de Sourcing.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to format ISO Date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="sourcing-dashboard" style={{ fontFamily: 'inherit' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-loader {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
        .tab-btn {
          padding: 0.75rem 1.25rem;
          font-weight: 500;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #64748b;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .tab-btn.active {
          color: var(--color-primary, #2563eb);
          border-bottom-color: var(--color-primary, #2563eb);
        }
        .history-row:hover {
          background-color: #f8fafc;
          cursor: pointer;
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span style={{ fontSize: '1.5rem' }}>🔍</span> Sourcing Intelligent IA
          </h2>
          <p className="text-sm text-muted" style={{ margin: '4px 0 0 0' }}>Trouvez, analysez et comparez des fournisseurs stratégiques mondiaux et locaux.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b mb-6" style={{ borderColor: '#e2e8f0' }}>
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Search size={18} />
          Rechercher
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <History size={18} />
          Historique des recherches
        </button>
      </div>

      {activeTab === 'search' ? (
        <>
          {/* SEARCH TAB FORM */}
          <div className="card mb-6">
            <form onSubmit={handleSearch} className="flex gap-4 items-end">
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label className="form-label">Que recherchez-vous ? (Produit / Service)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Pneus Michelin 315/80R22.5" 
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Ville / Région</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: '2.5rem' }}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'center' }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
            </form>
          </div>

          {/* SMART PERCENTAGE LOADER */}
          {loading && (
            <div className="card mt-6" style={{ border: '1px solid #dbeafe', backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
              <div className="flex flex-col items-center justify-center py-10 bg-blue-50/30" style={{ borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Loader2 size={52} className="animate-spin text-blue-600" style={{ color: '#2563eb' }} />
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e40af' }}>
                    {progress}%
                  </div>
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e3a8a', margin: '0 0 0.5rem 0' }}>Recherche & Sourcing en cours...</h3>
                <p style={{ color: '#3b82f6', maxWidth: '500px', padding: '0 1rem', margin: '0 auto 1rem auto' }}>
                  L'assistant de sourcing recherche en temps réel et analyse les bases de données pour identifier les meilleurs partenaires commerciaux pour <strong>"{product}"</strong> à <strong>{location}</strong>.
                </p>

                {/* Percentage Bar */}
                <div style={{ width: '80%', maxWidth: '400px', height: '12px', backgroundColor: '#e0e7ff', borderRadius: '9999px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: '#2563eb',
                    backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)',
                    backgroundSize: '1rem 1rem',
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '9999px'
                  }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  {progress < 30 ? "Initialisation de l'Agent IA..." : progress < 60 ? "Parcours des résultats Google..." : progress < 90 ? "Extraction et filtrage des coordonnées (téléphones, emails)..." : "Finalisation du tableau comparatif..."}
                </div>
              </div>
              
              {/* Guarantees render via standard inline CSS */}
              <h4 style={{ marginBottom: '1rem', color: '#94a3b8', fontWeight: 500 }}>Extraction des fournisseurs en temps réel...</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                    <div className="skeleton-loader" style={{ height: '48px', width: '48px', borderRadius: '6px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                      <div className="skeleton-loader" style={{ height: '16px', width: '40%', borderRadius: '4px' }}></div>
                      <div className="skeleton-loader" style={{ height: '12px', width: '25%', borderRadius: '4px' }}></div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                      <div className="skeleton-loader" style={{ height: '12px', width: '80%', borderRadius: '4px' }}></div>
                      <div className="skeleton-loader" style={{ height: '12px', width: '60%', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULTS SECTION */}
          {!loading && results && (
            <div className="card animate-fadeIn">
              <h3 className="mb-4" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <span>Résultats trouvés ({results.length} fournisseurs)</span>
              </h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fournisseur</th>
                      <th>Contact / Tél.</th>
                      <th>Adresse</th>
                      <th>Pertinence / Avis IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((sup, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={16} color="#2563eb" />
                            {sup.supplier_name}
                          </div>
                          {sup.website && sup.website !== 'N/A' && (
                            <a href={sup.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', textDecoration: 'none' }}>
                              <Globe size={12} /> Visiter le site
                            </a>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <Phone size={14} color="#64748b" />
                            <span style={{ fontWeight: 500 }}>{sup.phone || 'Non renseigné'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.875rem', color: '#475569' }}>
                          {sup.address || 'Non renseignée'}
                        </td>
                        <td style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
                          <div style={{ backgroundColor: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                            {sup.justification}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* HISTORY TAB */
        <>
          {selectedHistoryItem ? (
            /* DETAILED VIEW OF A SAVED HISTORY SEARCH */
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button 
                  onClick={() => setSelectedHistoryItem(null)}
                  className="btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', background: '#fff' }}
                >
                  <ArrowLeft size={16} />
                  Retour à l'historique
                </button>
                <button 
                  onClick={(e) => handleDeleteHistory(e, selectedHistoryItem.id)}
                  className="btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #fecaca', padding: '0.5rem 1rem', background: '#fef2f2', color: '#dc2626' }}
                >
                  <Trash2 size={16} />
                  Supprimer la recherche
                </button>
              </div>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0 }}>Recherche : {selectedHistoryItem.product}</h3>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} /> {selectedHistoryItem.location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} /> Effectuée le : {formatDate(selectedHistoryItem.created_at)}
                  </div>
                </div>
              </div>

              <h4 className="mb-3">Fournisseurs extraits ({selectedHistoryItem.results?.length || 0})</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fournisseur</th>
                      <th>Contact / Tél.</th>
                      <th>Adresse</th>
                      <th>Pertinence / Avis IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryItem.results?.map((sup, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={16} color="#2563eb" />
                            {sup.supplier_name}
                          </div>
                          {sup.website && sup.website !== 'N/A' && (
                            <a href={sup.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.8125rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', textDecoration: 'none' }}>
                              <Globe size={12} /> Visiter le site
                            </a>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <Phone size={14} color="#64748b" />
                            <span style={{ fontWeight: 500 }}>{sup.phone || 'Non renseigné'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.875rem', color: '#475569' }}>
                          {sup.address || 'Non renseignée'}
                        </td>
                        <td style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
                          <div style={{ backgroundColor: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                            {sup.justification}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* LIST OF HISTORY ITEMS */
            <div className="card">
              <h3 className="mb-4">Recherches récentes</h3>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <Loader2 size={36} className="animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-muted">Chargement de l'historique...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <History size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                  <p>Aucune recherche enregistrée dans l'historique pour le moment.</p>
                  <button className="btn btn-primary mt-4" onClick={() => setActiveTab('search')}>
                    Faire ma première recherche
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Produit recherché</th>
                        <th>Localisation</th>
                        <th>Date de la recherche</th>
                        <th>Fournisseurs trouvés</th>
                        <th style={{ width: '120px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((item) => (
                        <tr key={item.id} className="history-row" onClick={() => setSelectedHistoryItem(item)}>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.product}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                              <MapPin size={14} color="#64748b" />
                              {item.location}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.875rem', color: '#475569' }}>
                            {formatDate(item.created_at)}
                          </td>
                          <td>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 'bold', color: '#334155' }}>
                              {item.results?.length || 0}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ fontSize: '0.8125rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHistoryItem(item);
                                }}
                              >
                                Voir
                              </button>
                              <button
                                onClick={(e) => handleDeleteHistory(e, item.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background-color 0.2s',
                                }}
                                title="Supprimer cette recherche"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SourcingDashboard;
