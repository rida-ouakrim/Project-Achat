import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, RefreshCw, Plus, Trash2, FileText, Eye, X, Printer, Upload, Image as ImageIcon, FileCheck } from 'lucide-react';
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

  // States for signed request sheet upload (Comptabilité & autres)
  const [requestFile, setRequestFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [formData, setFormData] = useState({
    assignment: '',
    observation: ''
  });
  
  const [items, setItems] = useState([{ product: '', qty: '' }]);

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const isAccountingUser = (userName || '').toLowerCase() === 'comptabilite@sefamar.ma' || (userName || '').toLowerCase().includes('compta');

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRequestFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    } else {
      setRequestFile(null);
      setFilePreview(null);
    }
  };

  const handlePrintBlankForm = () => {
    const printWindow = window.open('', '_blank');
    const validItems = items.filter(it => it.product && it.product.trim());
    const rowsHtml = validItems.length > 0
      ? validItems.map(it => `
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: 600;">${it.product}</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: 600;">${it.qty || 1}</td>
        </tr>
      `).join('')
      : `
        <tr><td style="padding: 22px; border: 1px solid #cbd5e1;">&nbsp;</td><td style="border: 1px solid #cbd5e1;">&nbsp;</td></tr>
        <tr><td style="padding: 22px; border: 1px solid #cbd5e1;">&nbsp;</td><td style="border: 1px solid #cbd5e1;">&nbsp;</td></tr>
        <tr><td style="padding: 22px; border: 1px solid #cbd5e1;">&nbsp;</td><td style="border: 1px solid #cbd5e1;">&nbsp;</td></tr>
        <tr><td style="padding: 22px; border: 1px solid #cbd5e1;">&nbsp;</td><td style="border: 1px solid #cbd5e1;">&nbsp;</td></tr>
      `;

    const htmlContent = `
      <html>
        <head>
          <title>Fiche de Demande d'Achat - Comptabilité</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #0f172a; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { font-size: 14px; }
            .sig-box { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig { border: 2px dashed #94a3b8; height: 130px; padding: 12px; border-radius: 8px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <img src="/logo.png" style="height: 40px; object-fit: contain;" />
              <div style="font-weight: 700; margin-top: 5px; font-size: 14px;">MAN Truck & Bus Maroc</div>
            </div>
            <div style="text-align: right;">
              <h1>DEMANDE D'ACHAT (FEUILLE PAPIER)</h1>
              <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Service Comptabilité</p>
            </div>
          </div>

          <div class="grid">
            <div>
              <p style="margin: 0 0 6px 0;"><strong>Demandeur :</strong> ${userName || 'Comptabilité'}</p>
              <p style="margin: 0;"><strong>Affectation :</strong> ${formData.assignment || 'À renseigner'}</p>
            </div>
            <div>
              <p style="margin: 0 0 6px 0;"><strong>Date d'émission :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
              <p style="margin: 0;"><strong>Référence :</strong> <i>Générée après téléversement</i></p>
            </div>
          </div>

          <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            Désignation des Articles Demandés
          </div>
          <table>
            <thead>
              <tr>
                <th>Désignation Article</th>
                <th style="width: 140px; text-align: center;">Quantité</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          ${formData.observation ? `
            <div style="margin-top: 20px; font-size: 13px;">
              <strong>Observation :</strong> ${formData.observation}
            </div>
          ` : ''}

          <div class="sig-box">
            <div class="sig">
              <div style="font-weight: 700; font-size: 12px; color: #475569;">1. VISA DEMANDEUR (Comptabilité)</div>
              <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">Nom & Date :</div>
            </div>
            <div class="sig" style="background-color: #faf5ff; border-color: #a855f7;">
              <div style="font-weight: 700; font-size: 12px; color: #7e22ce;">2. VISA & SIGNATURE DU VALIDATEUR (Obligatoire)</div>
              <div style="margin-top: 6px; font-size: 11px; color: #9333ea;">
                Signature physique & Cachet autorisant la commande avant scan.
              </div>
            </div>
          </div>

          <p style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            Document officiel à faire signer puis à photographier/scanner pour téléversement sur le portail Achats MAN.
          </p>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 400);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.some(item => !item.product.trim() || !item.qty)) {
      toast.error("Veuillez remplir tous les produits et quantités.");
      return;
    }

    if (isAccountingUser && !requestFile) {
      toast.error("Veuillez joindre la photo ou le scan de la feuille signée par votre validateur.");
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      const currentUserId = parseInt(userId || localStorage.getItem('userId'));
      if (!currentUserId || isNaN(currentUserId)) {
        toast.error("Session utilisateur expirée. Veuillez vous reconnecter.");
        setError("Session expirée. Veuillez vous déconnecter et vous reconnecter.");
        setSubmitting(false);
        return;
      }

      if (requestFile) {
        const payload = new FormData();
        payload.append('requester', currentUserId);
        payload.append('assignment', formData.assignment);
        payload.append('observation', formData.observation || '');
        payload.append('status', 'En attente');
        payload.append('items', JSON.stringify(items.map(item => ({
          product: item.product,
          qty: parseInt(item.qty)
        }))));
        payload.append('request_pdf', requestFile);
        await createRequest(payload);
      } else {
        const payload = {
          requester: currentUserId,
          assignment: formData.assignment,
          observation: formData.observation || '',
          status: 'En attente',
          items: items.map(item => ({
            product: item.product,
            qty: parseInt(item.qty)
          }))
        };
        await createRequest(payload);
      }

      setFormData({ assignment: '', observation: '' });
      setItems([{ product: '', qty: '' }]);
      setRequestFile(null);
      setFilePreview(null);
      // Recharger les demandes et les suggestions pour actualiser
      await loadRequests();
      await loadSuggestions();
      toast.success(
        isAccountingUser
          ? 'Votre demande avec feuille signée a été transmise directement aux Achats !'
          : 'Votre demande a été créée et transmise avec succès !'
      );
    } catch (err) {
      console.error("Erreur lors de la création de la demande :", err);
      const detail = err.response?.data
        ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : String(err.response.data))
        : "Échec de la soumission de la demande d'achat.";
      toast.error("Impossible de soumettre la demande.");
      setError(detail);
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

      {isAccountingUser && (
        <div className="card mb-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem 1.25rem' }}>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h4 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={20} /> Espace Demandeur - Équipe Comptabilité (Validation Papier)
              </h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#15803d' }}>
                Votre validateur ne passe pas par l'application : faites signer la feuille papier par votre responsable, puis téléversez la photo signée ci-dessous.
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ borderColor: '#16a34a', color: '#16a34a', backgroundColor: '#ffffff', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={handlePrintBlankForm}
            >
              <Printer size={15} /> Imprimer la feuille à faire signer
            </button>
          </div>
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

          {/* Zone d'upload de la feuille signée pour la comptabilité */}
          <div style={{ backgroundColor: isAccountingUser ? '#faf5ff' : 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: isAccountingUser ? '2px dashed #c084fc' : '1px solid #e2e8f0' }}>
            <label className="form-label" style={{ fontWeight: 600, color: isAccountingUser ? '#6b21a8' : 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={18} />
              {isAccountingUser ? 'Photo ou Scan de la Demande Signée (Obligatoire)' : 'Fichier ou document joint (Optionnel)'}
            </label>
            <p className="text-xs text-muted mb-3">
              {isAccountingUser 
                ? 'Prenez en photo ou scannez la feuille signée et cachetée par votre validateur (Formats acceptés : JPG, PNG, PDF).'
                : 'Joindre un document ou scan si nécessaire.'}
            </p>
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="form-input"
              style={{ backgroundColor: '#ffffff' }}
              required={isAccountingUser}
              disabled={submitting}
            />
            {filePreview && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p className="text-xs text-muted mb-2">Aperçu de la feuille signée :</p>
                <img src={filePreview} alt="Aperçu signature" style={{ maxHeight: '220px', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
              </div>
            )}
            {requestFile && !filePreview && (
              <p className="text-xs mt-2" style={{ color: '#16a34a', fontWeight: 600 }}>
                Document sélectionné : {requestFile.name}
              </p>
            )}
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
                          <span>Feuille Signée</span>
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
                          Validé ({req.validated_by_name === 'man@sefamar.ma' ? 'Mme EL MANSOURI' : req.validated_by_name === 'chadi@sefamar.ma' ? 'Chadi' : req.validated_by_name === 'obelkadi.man@sefamar.ma' ? 'O. BELKADI (Commercial)' : req.validated_by_name === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' : req.validated_by_name || 'Achats'})
                        </span>
                      ) : isAccountingUser ? (
                        <span className="badge" style={{ 
                          backgroundColor: '#fef3c7', 
                          color: '#92400e', 
                          border: '1px solid #fde68a',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          Feuille signée transmise
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
