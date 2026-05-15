import React, { useState, useEffect } from 'react';
import { Edit2, Check, X, FileUp, Search, RefreshCw, Download, UserPlus, BookOpen, Tag, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRequests, updateRequest, createUser, fetchCatalog, createCatalog, updateCatalog, deleteCatalog } from '../api';

const PurchasingDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRefuseModalOpen, setIsRefuseModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('');
  const [refusalReason, setRefusalReason] = useState('');

  // Form states for approval/order
  const [itemApprovals, setItemApprovals] = useState([]);

  // Form states for editing
  const [editItems, setEditItems] = useState([]);
  const [editObservation, setEditObservation] = useState('');

  // Fix: Adding missing states that were accidentally deleted!
  const [suggestedSuppliers, setSuggestedSuppliers] = useState([]);



  // Filter report month
  const [reportMonth, setReportMonth] = useState('2026-05');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fetchRequests();
      setRequests(response.data);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les demandes d'achat depuis le serveur Django.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter(
    req => req.status === 'En attente' && req.requester_name.toLowerCase().includes(filter.toLowerCase())
  );

  const orderTrackingRequests = requests.filter(
    req => req.status === 'Commandé' || req.status === 'Reçu'
  );

  const handleOpenApprove = async (req) => {
    setSelectedRequest(req);
    setItemApprovals(req.items ? req.items.map(it => ({ ...it, supplier: '', price: '' })) : []);
    setSuggestedSuppliers([]);
    setIsApproveModalOpen(true);
    
    // Charger intelligemment TOUT le catalogue pour offrir TOUJOURS une sélection de fournisseurs !
    try {
      const response = await fetchCatalog(); // Ne pas passer req.product pour tout avoir !
      setSuggestedSuppliers(response.data);
    } catch (err) {
      console.error("Erreur lors du chargement des suggestions de fournisseurs", err);
    }
  };

  // Remplissage auto lors de la sélection d'un fournisseur suggéré
  const handleSelectSuggested = (index, selectedVal) => {
    const newApprovals = [...itemApprovals];
    if (selectedVal === "NEW") {
      newApprovals[index].supplier = '';
      newApprovals[index].price = '';
    } else {
      const option = suggestedSuppliers.find(s => s.id.toString() === selectedVal);
      if (option) {
        newApprovals[index].supplier = option.supplier_name;
        const numericPrice = option.price.replace(/[^0-9.]/g, '');
        newApprovals[index].price = numericPrice;
      }
    }
    setItemApprovals(newApprovals);
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    try {
      // Validation: Ensure all items have a supplier and price
      if (itemApprovals.some(it => !it.supplier || !it.price)) {
        return toast.error("Veuillez renseigner le fournisseur et le prix pour tous les articles.");
      }

      const payload = {
        status: 'Commandé',
        items: itemApprovals.map(it => ({
          ...it,
          price: it.price.includes('MAD') ? it.price : `${it.price} MAD`
        }))
      };
      await updateRequest(selectedRequest.id, payload);
      setIsApproveModalOpen(false);
      setSelectedRequest(null);
      toast.success("La commande a été validée avec succès !");
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la validation de la commande.");
    }
  };

  const handleMarkReceived = async (id) => {
    try {
      await updateRequest(id, { status: 'Reçu' });
      toast.success("Statut mis à jour : Produit reçu !");
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du marquage comme reçu.");
    }
  };

  const handleOpenEdit = (req) => {
    setSelectedRequest(req);
    setEditItems(req.items ? [...req.items] : []);
    setEditObservation(req.observation || '');
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        items: editItems,
        observation: editObservation
      };
      await updateRequest(selectedRequest.id, payload);
      setIsEditModalOpen(false);
      setSelectedRequest(null);
      toast.success("Demande modifiée avec succès.");
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de modifier la demande.");
    }
  };

  const handleOpenRefuse = (req) => {
    setSelectedRequest(req);
    setRefusalReason('');
    setIsRefuseModalOpen(true);
  };

  const handleConfirmRefuse = async (e) => {
    e.preventDefault();
    if (!refusalReason.trim()) return toast.error("Le motif du refus est obligatoire.");
    
    try {
      await updateRequest(selectedRequest.id, { 
        status: 'Refusé', 
        refusal_reason: refusalReason 
      });
      setIsRefuseModalOpen(false);
      setSelectedRequest(null);
      toast.error("Demande refusée avec motif enregistré.");
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du refus.");
    }
  };

  const handleDownloadReceipt = (order) => {
    let totalOrderAmount = 0;
    const itemsHtml = order.items.map(it => {
        const up = parseFloat((it.price || '0').replace(/[^0-9.]/g, '')) || 0;
        const total = up * it.qty;
        totalOrderAmount += total;
        return `
          <tr>
            <td style="font-weight: 600; color: #0f172a;">${it.product}</td>
            <td style="font-style: italic;">${it.supplier || '-'}</td>
            <td style="text-align: center; font-weight: 600;">${it.qty}</td>
            <td style="text-align: right;">${up.toLocaleString('fr-FR')} MAD</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${total.toLocaleString('fr-FR')} MAD</td>
          </tr>
        `;
    }).join('');
    
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
        <head>
          <title>Bon de Commande ${order.order_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              height: 45px;
              object-fit: contain;
            }
            .title {
              text-align: right;
            }
            .title h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.025em;
            }
            .title p {
              margin: 5px 0 0 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 500;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section-title {
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748b;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
              margin-bottom: 12px;
              letter-spacing: 0.05em;
            }
            .detail-item {
              margin-bottom: 8px;
              font-size: 14px;
              color: #334155;
            }
            .detail-item strong {
              color: #0f172a;
            }
            .detail-item span {
              font-weight: 600;
              color: #0f172a;
            }
            .table-receipt {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 50px;
            }
            .table-receipt th {
              background-color: #f8fafc;
              color: #475569;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              text-align: left;
              padding: 12px;
              border-bottom: 2px solid #e2e8f0;
              letter-spacing: 0.05em;
            }
            .table-receipt td {
              padding: 16px 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
              color: #334155;
            }
            .total-row {
              font-weight: 800;
              font-size: 16px;
              background-color: #f8fafc;
            }
            .signature-box {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 100px;
              padding: 0 20px;
            }
            .signature {
              border-top: 1px dashed #cbd5e1;
              text-align: center;
              padding-top: 10px;
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
            }
            .footer-receipt {
              margin-top: 100px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              font-weight: 400;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="/logo.png" alt="MAN Logo" />
            <div class="title">
              <h1>BON DE COMMANDE</h1>
              <p>Référence : ${order.order_number}</p>
            </div>
          </div>
          
          <div class="details-grid">
            <div>
              <div class="section-title">Émetteur</div>
              <div class="detail-item"><strong>MAN Truck & Bus Maroc</strong></div>
              <div class="detail-item">Département Achats & Approvisionnements</div>
              <div class="detail-item">Zone Industrielle, Casablanca</div>
              <div class="detail-item">Contact: achats@man-trucks.ma</div>
            </div>
            <div>
              <div class="section-title">Détails d'Affectation</div>
              <div class="detail-item">Demandeur principal : <span>${order.requester_name}</span></div>
              <div class="detail-item">Affectation Camion : <span>${order.assignment || 'Non spécifiée'}</span></div>
              <div class="detail-item">Date d'enregistrement : <span>${order.date_created}</span></div>
              <div class="detail-item">Statut de la demande : <span style="color: #10b981; font-weight: 700;">LIVRÉ / REÇU</span></div>
            </div>
          </div>

          <div class="section-title">Description des Biens/Services</div>
          <table class="table-receipt">
            <thead>
              <tr>
                <th>Désignation Article</th>
                <th>Fournisseur Retenu</th>
                <th style="text-align: center;">Quantité</th>
                <th style="text-align: right;">Prix Unitaire</th>
                <th style="text-align: right;">Montant Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="border: none; background: transparent;"></td>
                <td style="text-align: right; border-top: 2px solid #0f172a;">MONTANT NET</td>
                <td style="text-align: right; color: #e11d48; border-top: 2px solid #0f172a; font-size: 18px;">${totalOrderAmount.toLocaleString('fr-FR')} MAD</td>
              </tr>
            </tbody>
          </table>

          <div class="signature-box">
            <div class="signature">Visa Département Achat</div>
            <div class="signature">Visa Direction Générale (DG)</div>
          </div>

          <div class="footer-receipt">
            <p>Ce document est une pièce comptable officielle émise électroniquement par le système MAN Procurement.</p>
            <p>&copy; ${new Date().getFullYear()} MAN Truck & Bus Maroc. Tous droits réservés.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 300);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };



  // 4. Fonctions de gestion manuelle du catalogue fournisseur
  const handleOpenCatalogEditor = (item = null) => {
    if (item) {
      setEditingCatalogItem(item);
      setCatProductName(item.product_name);
      setCatSupplierName(item.supplier_name);
      setCatPrice(item.price.replace(/[^0-9.]/g, ''));
    } else {
      setEditingCatalogItem(null);
      setCatProductName('');
      setCatSupplierName('');
      setCatPrice('');
    }
    setIsCatalogModalOpen(true);
  };

  const handleSaveCatalogItem = async (e) => {
    e.preventDefault();
    const data = {
      product_name: catProductName,
      supplier_name: catSupplierName,
      price: `${catPrice} MAD`
    };
    try {
      if (editingCatalogItem) {
        await updateCatalog(editingCatalogItem.id, data);
      } else {
        await createCatalog(data);
      }
      setIsCatalogModalOpen(false);
      loadFullCatalog();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement dans le catalogue.");
    }
  };

  const handleDeleteCatalogItem = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce prix du catalogue ?")) {
      try {
        await deleteCatalog(id);
        loadFullCatalog();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Espace Achats</h2>
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
        <div className="flex justify-between items-center mb-4">
          <h3>Demandes d'achat (En attente)</h3>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Filtrer par demandeur..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-input" 
              style={{ paddingLeft: '2.5rem', width: '250px' }}
            />
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Chargement des demandes...</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Demandeur</th>
                  <th>Produits (Qté)</th>
                  <th>Service</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 500 }}>{req.order_number}</td>
                    <td>{req.requester_name}</td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                        {req.items && req.items.map((it, idx) => (
                          <li key={idx}><strong>{it.qty}x</strong> {it.product}</li>
                        ))}
                      </ul>
                    </td>
                    <td>{req.assignment}</td>
                    <td>
                      <span className="badge badge-pending">
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleOpenEdit(req)} title="Modifier">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--color-success)' }} onClick={() => handleOpenApprove(req)} title="Approuver et Commander">
                          <Check size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleOpenRefuse(req)} title="Refuser">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Aucune demande en attente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 2 }}>
          <h3>Suivi des Commandes</h3>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Chargement du suivi...</p>
          ) : (
            <div className="table-container mt-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° Commande</th>
                    <th>Produits</th>
                    <th>Fournisseurs</th>
                    <th>Prix Total</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orderTrackingRequests.map(order => {
                    let orderTotal = 0;
                    return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 500 }}>{order.order_number}</td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                          {order.items && order.items.map((it, idx) => (
                            <li key={idx}>{it.product} ({it.qty})</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          {order.items && order.items.map((it, idx) => (
                            <li key={idx}>{it.supplier || '-'}</li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {order.items && order.items.map((it, idx) => {
                          const up = parseFloat((it.price || '0').replace(/[^0-9.]/g, '')) || 0;
                          const total = up * it.qty;
                          orderTotal += total;
                          return (
                            <div key={idx} style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>{it.price} x {it.qty} = {total.toLocaleString('fr-FR')}</div>
                          );
                        })}
                        <div style={{ color: '#0f172a', marginTop: '4px' }}>{orderTotal.toLocaleString('fr-FR')} MAD</div>
                      </td>
                      <td>
                        <span className={`badge badge-${order.status === 'Commandé' ? 'ordered' : 'received'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2 items-center">
                          {order.status === 'Commandé' && (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleMarkReceived(order.id)}
                            >
                              Marquer Reçu
                            </button>
                          )}
                          {order.status === 'Reçu' && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                              onClick={() => handleDownloadReceipt(order)}
                              title="Imprimer / Enregistrer le Reçu PDF officiel"
                            >
                              <Download size={12} />
                              Reçu PDF
                            </button>
                          )}
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Upload reçu PDF">
                            <FileUp size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                  {orderTrackingRequests.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        Aucune commande en cours de suivi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card - Reporting */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3>Reporting Achats</h3>
            <p className="text-sm text-muted mb-4">Exporter les commandes au format CSV Excel.</p>
            <div className="form-group">
              <label className="form-label">Sélectionner un mois</label>
              <input 
                type="month" 
                className="form-input" 
                value={reportMonth} 
                onChange={(e) => setReportMonth(e.target.value)} 
              />
            </div>
            <button className="btn btn-primary w-full mt-2" style={{ width: '100%' }} onClick={() => {
              const ordersToExport = requests.filter(req => {
                const isCompleted = req.status === 'Commandé' || req.status === 'Reçu';
                if (!isCompleted) return false;
                if (req.date_created && reportMonth) return req.date_created.startsWith(reportMonth);
                return true;
              });
              if (ordersToExport.length === 0) return toast.error("Aucune commande enregistrée pour ce mois.");
              let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
              csvContent += "Numéro de Commande,Demandeur,Article,Quantité,Fournisseur,Prix Unitaire,Montant Total,Statut,Date\n";
              ordersToExport.forEach(order => {
                if (order.items) {
                  order.items.forEach(it => {
                    const up = parseFloat((it.price || '0').replace(/[^0-9.]/g, '')) || 0;
                    const total = up * it.qty;
                    csvContent += `"${order.order_number}","${order.requester_name}","${it.product}",${it.qty},"${it.supplier || ''}","${it.price || ''}","${total} MAD","${order.status}","${order.date_created}"\n`;
                  });
                }
              });
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `Rapport_Achats_${reportMonth}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              <Download size={16} />
              Générer & Télécharger CSV
            </button>
          </div>
        </div>
      </div>

      {/* Modal - Modifier */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Modifier la demande ({selectedRequest?.order_number})</h3>
              <button className="btn btn-outline" onClick={() => setIsEditModalOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleConfirmEdit}>
              {editItems.map((item, index) => (
                <div key={index} className="flex gap-4" style={{ marginBottom: '1rem' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Produit</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={item.product} 
                      onChange={(e) => {
                        const newItems = [...editItems];
                        newItems[index].product = e.target.value;
                        setEditItems(newItems);
                      }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label" style={{ display: index === 0 ? 'block' : 'none' }}>Quantité</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={item.qty} 
                      onChange={(e) => {
                        const newItems = [...editItems];
                        newItems[index].qty = e.target.value;
                        setEditItems(newItems);
                      }}
                      required
                      min="1"
                    />
                  </div>
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Observation</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  value={editObservation}
                  onChange={(e) => setEditObservation(e.target.value)}
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Approuver & Assigner Fournisseur + Prix */}
      {isApproveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Approuver la demande ({selectedRequest?.order_number})</h3>
              <button className="btn btn-outline" onClick={() => setIsApproveModalOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleConfirmOrder}>
              <p className="text-sm text-muted mb-4">
                Veuillez renseigner le fournisseur et le prix négocié pour chaque article de la commande.
              </p>

              {itemApprovals.map((item, index) => (
                <div key={item.id} style={{ backgroundColor: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#0f172a' }}>{item.product} (Qté : {item.qty})</h4>
                  
                  {suggestedSuppliers.length > 0 && (
                    <div className="form-group" style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #dcfce7', marginBottom: '1rem' }}>
                      <label className="form-label" style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={16} /> Référentiel Fournisseurs Global
                      </label>
                      <select className="form-input" style={{ borderColor: '#86efac' }} onChange={(e) => handleSelectSuggested(index, e.target.value)}>
                        <option value="NEW">-- Saisir manuellement le fournisseur --</option>
                        
                        {suggestedSuppliers.some(s => s.product_name.toLowerCase().includes(item.product.toLowerCase())) && (
                          <optgroup label="✨ Correspondances directes pour ce produit">
                            {suggestedSuppliers
                              .filter(s => s.product_name.toLowerCase().includes(item.product.toLowerCase()))
                              .map(s => (
                                <option key={s.id} value={s.id}>{s.supplier_name} ({s.price})</option>
                              ))
                            }
                          </optgroup>
                        )}

                        <optgroup label="📚 Tous les autres fournisseurs du catalogue">
                          {suggestedSuppliers
                            .filter(s => !s.product_name.toLowerCase().includes(item.product.toLowerCase()))
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.supplier_name} ({s.product_name} - {s.price})</option>
                            ))
                          }
                        </optgroup>
                      </select>
                      <small style={{ color: '#15803d', marginTop: '0.5rem', display: 'block' }}>💡 Sélectionner une option remplit automatiquement les champs ci-dessous !</small>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Fournisseur</label>
                      <input 
                        type="text"
                        className="form-input" 
                        placeholder="Ex: AutoParts SARL" 
                        value={item.supplier} 
                        onChange={(e) => {
                          const newApp = [...itemApprovals];
                          newApp[index].supplier = e.target.value;
                          setItemApprovals(newApp);
                        }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Prix Unitaire (MAD)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="Ex: 450" 
                        value={item.price}
                        onChange={(e) => {
                          const newApp = [...itemApprovals];
                          newApp[index].price = e.target.value;
                          setItemApprovals(newApp);
                        }}
                        required
                        min="0.1"
                        step="any"
                      />
                    </div>
                  </div>
                  
                  {item.price && (
                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                      Total pour cet article : <strong style={{ color: '#e11d48' }}>{(parseFloat(item.price) * item.qty).toLocaleString('fr-FR')} MAD</strong>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setIsApproveModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-success)' }}>
                  Confirmer et Commander
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal - Motif de Refus */}
      {isRefuseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ borderBottomColor: '#fee2e2' }}>
              <h3 style={{ color: '#b91c1c' }}>Motif de refus ({selectedRequest?.order_number})</h3>
              <button className="btn btn-outline" onClick={() => setIsRefuseModalOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleConfirmRefuse}>
              <p className="text-sm text-muted mb-4">
                Veuillez indiquer la raison du rejet de cette demande. Le demandeur pourra consulter ce motif sur son tableau de bord.
              </p>
              
              <div className="form-group">
                <label className="form-label" style={{ color: '#b91c1c' }}>Explication / Motif *</label>
                <textarea 
                  className="form-input" 
                  rows="4"
                  placeholder="Ex: Budget annuel dépassé, produit indisponible, hors nomenclature..." 
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  required
                  style={{ borderColor: '#fecaca' }}
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setIsRefuseModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-danger">
                  Confirmer le Refus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchasingDashboard;
