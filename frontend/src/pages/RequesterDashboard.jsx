import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, RefreshCw, Plus, Trash2, FileText, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRequests, createRequest, fetchCatalog } from '../api';

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendBase = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '';
  return backendBase + path;
};

const RequesterDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Tous');
  
  // States for request details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState(null);

  const [formData, setFormData] = useState({
    assignment: '',
    observation: ''
  });
  
  const [items, setItems] = useState([{ product: '', qty: '' }]);

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fetchRequests();
      // Filtrer les demandes pour n'afficher que celles créées par l'utilisateur connecté actuel
      const myRequests = response.data.filter(req => req.requester === parseInt(userId));
      setRequests(myRequests);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les demandes depuis le serveur Django.");
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await fetchCatalog();
      // Récupérer le nom unique de tous les articles du catalogue
      const products = response.data.map(item => item.product_name);
      const uniqueProducts = [...new Set(products)];
      setProductSuggestions(uniqueProducts);
    } catch (err) {
      console.error("Erreur de chargement des suggestions:", err);
    }
  };

  useEffect(() => {
    loadRequests();
    loadSuggestions();
  }, []);

  const handleItemChange = (index, e) => {
    const newItems = [...items];
    newItems[index][e.target.name] = e.target.value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { product: '', qty: '' }]);
  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.some(item => !item.product.trim() || !item.qty)) {
      toast.error("Veuillez remplir tous les produits et quantités.");
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        requester: parseInt(userId),
        assignment: formData.assignment,
        observation: formData.observation,
        status: 'En attente',
        items: items.map(item => ({
          product: item.product,
          qty: parseInt(item.qty)
        }))
      };

      await createRequest(payload);
      setFormData({ assignment: '', observation: '' });
      setItems([{ product: '', qty: '' }]);
      // Recharger les demandes et les suggestions pour actualiser
      await loadRequests();
      await loadSuggestions();
      toast.success('Votre demande a été créée et transmise avec succès !');
    } catch (err) {
      console.error(err);
      toast.error("Impossible de soumettre la demande.");
      setError("Échec de la soumission de la demande d'achat.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'Tous') return true;
    return req.status === statusFilter;
  });

  return (
    <div>
      {/* Suggestions de produits */}
      <datalist id="product-suggestions">
        {productSuggestions.map((prod, idx) => (
          <option key={idx} value={prod} />
        ))}
      </datalist>

      <div className="flex justify-between items-center mb-4">
        <h2>Espace Demandeur</h2>
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

      <div className="card">
        <h3>Nouvelle Demande</h3>
        <p className="text-muted mb-4 text-sm">Remplissez ce formulaire pour créer une nouvelle demande d'achat.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="flex gap-4" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Numéro de commande</label>
              <input type="text" className="form-input" value="Généré automatiquement" readOnly style={{ fontStyle: 'italic' }} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Demandeur</label>
              <input type="text" className="form-input" value={userName || 'Chargement...'} readOnly />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Date</label>
              <input type="text" className="form-input" value={new Date().toISOString().split('T')[0]} readOnly />
            </div>
          </div>

          <div className="flex gap-4" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Affectation</label>
              <input 
                type="text" 
                name="assignment" 
                value={formData.assignment} 
                onChange={handleChange} 
                className="form-input" 
                required 
                placeholder="Ex: Camion MAN S62"
                disabled={submitting}
              />
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div className="flex justify-between items-center mb-4">
              <label className="form-label" style={{ marginBottom: 0 }}>Articles demandés</label>
              <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={addItem} disabled={submitting}>
                <Plus size={14} /> Ajouter un article
              </button>
            </div>
            
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-start" style={{ marginBottom: index === items.length - 1 ? '0' : '1rem' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <input 
                    type="text" 
                    name="product" 
                    value={item.product} 
                    onChange={(e) => handleItemChange(index, e)} 
                    className="form-input" 
                    required 
                    placeholder="Nom du produit (Ex: Filtre à air)"
                    disabled={submitting}
                    list="product-suggestions"
                  />
                </div>
                <div className="form-group" style={{ width: '120px', marginBottom: 0 }}>
                  <input 
                    type="number" 
                    name="qty" 
                    value={item.qty} 
                    onChange={(e) => handleItemChange(index, e)} 
                    className="form-input" 
                    required 
                    min="1"
                    placeholder="Qté"
                    disabled={submitting}
                  />
                </div>
                {items.length > 1 && (
                  <button type="button" className="btn btn-outline" style={{ padding: '0.6rem', color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => removeItem(index)} disabled={submitting} title="Supprimer cet article">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Observation</label>
            <textarea 
              name="observation" 
              value={formData.observation} 
              onChange={handleChange} 
              className="form-input" 
              rows="3" 
              placeholder="Détails supplémentaires..."
              disabled={submitting}
            ></textarea>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <AlertCircle size={16} />
              <span>Pour modifier une demande, veuillez contacter le service des achats.</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={16} />
              {submitting ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 style={{ margin: 0 }}>Mes Demandes</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Statut :</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: '160px', padding: '0.35rem 0.5rem', fontSize: '0.8125rem' }}
            >
              <option value="Tous">Tous</option>
              <option value="En attente">En attente</option>
              <option value="Commandé">Commandé</option>
              <option value="Reçu">Reçu</option>
              <option value="Refusé">Refusé</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Chargement des données...</p>
        ) : (
          <div className="table-container mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Articles</th>
                  <th>Affectation</th>
                  <th>Date</th>
                  <th>Validation</th>
                  <th>Statut Achat</th>
                  <th style={{ textAlign: 'center' }}>Détails</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => (
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
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                        {req.items && req.items.map((it, idx) => (
                          <li key={idx}><strong>{it.qty}x</strong> {it.product}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>{req.assignment}</td>
                    <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{req.date_created}</td>
                    <td>
                      {req.is_validated ? (
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
                          Validé ({req.validated_by_name === 'man@sefamar.ma' ? 'Mme EL MANSOURI' : req.validated_by_name === 'chadi@sefamar.ma' ? 'Chadi' : req.validated_by_name === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' : req.validated_by_name})
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
                        req.status === 'En attente' ? 'pending' : 
                        req.status === 'Approuvé' ? 'approved' : 
                        req.status === 'Commandé' ? 'ordered' : 
                        req.status === 'Reçu' ? 'received' : 'rejected'
                      }`}>
                        {req.status}
                      </span>
                      {req.status === 'Refusé' && req.refusal_reason && (
                        <div style={{ 
                          fontSize: '0.7rem', 
                          color: '#b91c1c', 
                          marginTop: '0.25rem', 
                          fontWeight: 500,
                          backgroundColor: '#fef2f2',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          border: '1px solid #fee2e2'
                        }}>
                          💡 {req.refusal_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem' }} 
                        onClick={() => {
                          setDetailsRequest(req);
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
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Aucune demande trouvée pour ce filtre.
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

    </div>
  );
};

export default RequesterDashboard;
