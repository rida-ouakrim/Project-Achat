import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, RefreshCw, Plus, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRequests, createRequest } from '../api';

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

  useEffect(() => {
    loadRequests();
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
      // Recharger les demandes pour afficher la nouvelle
      await loadRequests();
      toast.success('Votre demande a été créée et transmise avec succès !');
    } catch (err) {
      console.error(err);
      toast.error("Impossible de soumettre la demande.");
      setError("Échec de la soumission de la demande d'achat.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
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
              <label className="form-label">Affectation (Service/Camion)</label>
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
        <h3>Mes Demandes</h3>
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
                  <th>Statut</th>
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
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                        {req.items && req.items.map((it, idx) => (
                          <li key={idx}><strong>{it.qty}x</strong> {it.product}</li>
                        ))}
                      </ul>
                    </td>
                    <td>{req.assignment}</td>
                    <td>{req.date_created}</td>
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
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Aucune demande soumise pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequesterDashboard;
