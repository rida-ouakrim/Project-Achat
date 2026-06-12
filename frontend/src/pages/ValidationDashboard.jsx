import React, { useState, useEffect } from 'react';
import { Check, RefreshCw, AlertCircle, FileText, CheckCircle, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRequests, validateRequest, updateRequest } from '../api';

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendBase = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '';
  return backendBase + path;
};

const ValidationDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validatingId, setValidatingId] = useState(null);
  const [refusingId, setRefusingId] = useState(null);

  // States for request details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState(null);

  // States for refusal modal
  const [isRefusalModalOpen, setIsRefusalModalOpen] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const userId = localStorage.getItem('userId');

  const getValidationDelay = (dateStr) => {
    if (!dateStr) return null;
    let createdDate;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        createdDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    if (!createdDate || isNaN(createdDate.getTime())) {
      createdDate = new Date(dateStr);
    }
    if (isNaN(createdDate.getTime())) return null;
    
    const today = new Date();
    createdDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fetchRequests();
      // Filtrer pour n'afficher que les demandes en attente de validation et non refusées
      const pendingValidation = response.data.filter(req => !req.is_validated && req.status === 'En attente');
      setRequests(pendingValidation);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les demandes à valider.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleValidate = async (id) => {
    setValidatingId(id);
    try {
      await validateRequest(id, userId);
      toast.success("Demande validée avec succès !");
      // Recharger la liste
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Échec de la validation de la demande.");
    } finally {
      setValidatingId(null);
    }
  };

  const handleRefuse = async (e) => {
    e.preventDefault();
    if (!refusalReason.trim() || !selectedRequestId) return;
    setRefusingId(selectedRequestId);
    try {
      await updateRequest(selectedRequestId, { 
        status: 'Refusé', 
        refusal_reason: refusalReason.trim() 
      });
      toast.success("Demande refusée avec succès !");
      setIsRefusalModalOpen(false);
      setRefusalReason('');
      setSelectedRequestId(null);
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Échec du refus de la demande.");
    } finally {
      setRefusingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2>Validation des Demandes</h2>
          <p className="text-sm text-muted">Valider les demandes formulées par les demandeurs pour autoriser l'achat par l'équipe achats.</p>
        </div>
        <button className="btn btn-outline" onClick={loadRequests} title="Actualiser" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem',
          borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      <div className="card accent-warning">
        <h3>Demandes en attente de validation</h3>
        
        {loading ? (
          <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>Chargement des demandes...</p>
        ) : (
          <div className="table-container mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Date</th>
                  <th>Demandeur</th>
                  <th>Articles</th>
                  <th>Affectation</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{req.order_number}</div>
                      {req.request_pdf && (
                        <a 
                          href={getMediaUrl(req.request_pdf)} 
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
                      <div style={{ fontWeight: 500 }}>
                        {req.date_created ? (() => {
                          const parts = req.date_created.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : req.date_created;
                        })() : '-'}
                      </div>
                      {(() => {
                        const delay = getValidationDelay(req.date_created);
                        if (delay === null) return null;
                        const delayText = delay === 0 ? "Aujourd'hui" : delay === 1 ? "Hier" : `Envoyée il y a ${delay} jours`;
                        const isDelayed = delay >= 2;
                        return (
                          <div style={{ 
                            fontSize: '0.72rem', 
                            color: isDelayed ? '#ef4444' : '#64748b', 
                            fontWeight: isDelayed ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.15rem',
                            marginTop: '0.25rem'
                          }}>
                            {isDelayed && <span style={{ fontSize: '0.8rem' }}>⚠️</span>}
                            <span>{delayText}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{req.requester_name}</td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                        {req.items && req.items.map((it, idx) => (
                          <li key={idx}><strong>{it.qty}x</strong> {it.product}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ maxWidth: '180px', wordBreak: 'break-all' }}>{req.assignment || '-'}</td>
                    <td>
                      <span className="badge badge-pending">
                        Non validé
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex gap-2 justify-center">
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem 0.6rem' }}
                          onClick={() => {
                            setDetailsRequest(req);
                            setIsDetailsModalOpen(true);
                          }}
                          title="Voir les détails"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ 
                            color: '#ef4444', 
                            borderColor: '#fee2e2', 
                            backgroundColor: '#fff5f5', 
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onClick={() => {
                            setSelectedRequestId(req.id);
                            setIsRefusalModalOpen(true);
                          }}
                          disabled={validatingId !== null || refusingId !== null}
                        >
                          <X size={14} />
                          Refuser
                        </button>
                        <button 
                          className="btn btn-primary" 
                          style={{ 
                            backgroundColor: 'var(--color-success)', 
                            borderColor: 'var(--color-success)', 
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onClick={() => handleValidate(req.id)}
                          disabled={validatingId !== null || refusingId !== null}
                        >
                          <Check size={14} />
                          {validatingId === req.id ? 'Validation...' : 'Valider'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '4rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
                        <CheckCircle size={36} style={{ color: 'var(--color-success)' }} />
                        <span style={{ fontWeight: 500 }}>Félicitations ! Toutes les demandes ont été validées.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Détails de la demande */}
      {isDetailsModalOpen && detailsRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
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
                    <span className="badge badge-pending">
                      Non validé
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted">Statut Achat</p>
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
                <p className="text-xs text-muted mb-2">Articles demandés</p>
                <div className="table-container">
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th style={{ textAlign: 'center' }}>Quantité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsRequest.items && detailsRequest.items.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{it.product}</td>
                          <td style={{ textAlign: 'center' }}>{it.qty}</td>
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

      {/* Modal - Motif de Refus */}
      {isRefusalModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#b91c1c' }}>Motif de Refus</h3>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setIsRefusalModalOpen(false);
                  setRefusalReason('');
                  setSelectedRequestId(null);
                }} 
                style={{ padding: '0.25rem', border: 'none' }}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRefuse} style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Veuillez indiquer la raison pour laquelle vous refusez cette demande d'achat. Un message sera envoyé au demandeur.
              </p>
              
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Raison du refus</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '100px', resize: 'vertical', padding: '0.5rem', width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                  placeholder="Ex: Spécifications incorrectes, budget dépassé..."
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => {
                    setIsRefusalModalOpen(false);
                    setRefusalReason('');
                    setSelectedRequestId(null);
                  }}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn" 
                  style={{ backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444' }}
                  disabled={refusingId !== null}
                >
                  {refusingId ? 'Refus...' : 'Confirmer le refus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ValidationDashboard;
