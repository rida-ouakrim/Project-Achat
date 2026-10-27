import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Check, X, FileUp, Search, RefreshCw, Download, UserPlus, BookOpen, Tag, Plus, Trash2, FileText, ExternalLink, Eye, FileCheck, ChevronLeft, ChevronRight, Calendar, Building2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRequests, updateRequest, createUser, fetchCatalog, createCatalog, updateCatalog, deleteCatalog, validateRequest } from '../api';

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendBase = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '';
  return backendBase + path;
};

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

  // States for viewing request details
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState(null);
 
  // State for filtering tracking table & pagination
  const [trackingFilter, setTrackingFilter] = useState('Tous');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackingPage, setTrackingPage] = useState(1);
  const itemsPerPage = 8;

  // Filtrage par entreprise / société (Tous, SEFAMAR, SOMABUS, CKD)
  const [companyFilter, setCompanyFilter] = useState('Tous');

  // Helper pour identifier l'entreprise d'une demande
  const getRequestCompany = (req) => {
    if (!req) return 'SEFAMAR';
    const comp = (req.company || req.requester_company || '').toUpperCase().trim();
    if (comp.includes('SOMA')) return 'SOMABUS';
    if (comp.includes('CKD')) return 'CKD';
    if (comp.includes('SUCC')) return 'Succursale';
    return 'SEFAMAR';
  };

  const renderCompanyBadge = (comp, req) => {
    const city = req ? (req.requester_city || req.city || '') : '';
    if (comp === 'SOMABUS') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 700,
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap'
        }}>
          SOMABUS
        </span>
      );
    }
    if (comp === 'CKD') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 700,
          backgroundColor: '#f1f5f9',
          color: '#334155',
          border: '1px solid #cbd5e1',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap'
        }}>
          CKD
        </span>
      );
    }
    if (comp === 'Succursale') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 700,
          backgroundColor: '#ccfbf1',
          color: '#0f766e',
          border: '1px solid #99f6e4',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap'
        }}>
          Succursale{city ? ` - ${city}` : ''}
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: '#eff6ff',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap'
      }}>
        SEFAMAR
      </span>
    );
  };

  const userId = localStorage.getItem('userId');

  const handleValidatePaper = async (requestId) => {
    try {
      await validateRequest(requestId, userId);
      toast.success("Demande validée avec succès (Feuille signée vérifiée).");
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la validation.");
    }
  };
 
  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fetchRequests();
      setRequests(response.data || []);
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
 
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  const getRelativeDelay = (dateStr) => {
    if (!dateStr) return null;
    try {
      const created = new Date(dateStr);
      const now = new Date();
      created.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Aujourd'hui";
      if (diffDays === 1) return "Hier";
      if (diffDays > 1) return `Il y a ${diffDays} j`;
    } catch {
      return null;
    }
    return null;
  };

  // Comptages des demandes par entreprise
  const companyCounts = useMemo(() => {
    const counts = { Tous: 0, SEFAMAR: 0, SOMABUS: 0, CKD: 0, Succursale: 0 };
    requests.forEach(req => {
      const comp = getRequestCompany(req);
      counts.Tous++;
      if (comp === 'SOMABUS') counts.SOMABUS++;
      else if (comp === 'CKD') counts.CKD++;
      else if (comp === 'Succursale') counts.Succursale++;
      else counts.SEFAMAR++;
    });
    return counts;
  }, [requests]);

  const pendingCompanyCounts = useMemo(() => {
    const counts = { Tous: 0, SEFAMAR: 0, SOMABUS: 0, CKD: 0, Succursale: 0 };
    requests.filter(req => req.status === 'En attente').forEach(req => {
      const comp = getRequestCompany(req);
      counts.Tous++;
      if (comp === 'SOMABUS') counts.SOMABUS++;
      else if (comp === 'CKD') counts.CKD++;
      else if (comp === 'Succursale') counts.Succursale++;
      else counts.SEFAMAR++;
    });
    return counts;
  }, [requests]);

  // Demandes en attente (Filtrage par recherche et par entreprise)
  const filteredRequests = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return requests.filter(req => {
      if (req.status !== 'En attente') return false;
      const comp = getRequestCompany(req);
      if (companyFilter !== 'Tous' && comp !== companyFilter) return false;
      if (!q) return true;
      const orderMatch = (req.order_number || '').toLowerCase().includes(q);
      const requesterMatch = (req.requester_name || '').toLowerCase().includes(q);
      const assignmentMatch = (req.assignment || '').toLowerCase().includes(q);
      const dateMatch = (req.date_created || '').includes(q);
      const compMatch = comp.toLowerCase().includes(q);
      const itemsMatch = (req.items || []).some(it => (it.product || '').toLowerCase().includes(q));
      return orderMatch || requesterMatch || assignmentMatch || dateMatch || itemsMatch || compMatch;
    });
  }, [requests, filter, companyFilter]);

  // Suivi des commandes (Filtrage mémoïsé par statut, recherche et entreprise)
  const orderTrackingRequests = useMemo(() => {
    const q = trackingSearch.toLowerCase().trim();
    return requests.filter(req => {
      const isCompleted = req.status === 'Commandé' || req.status === 'Reçu';
      if (!isCompleted) return false;
      const comp = getRequestCompany(req);
      if (companyFilter !== 'Tous' && comp !== companyFilter) return false;
      if (trackingFilter !== 'Tous' && req.status !== trackingFilter) return false;
      if (!q) return true;
      const orderMatch = (req.order_number || '').toLowerCase().includes(q);
      const requesterMatch = (req.requester_name || '').toLowerCase().includes(q);
      const assignmentMatch = (req.assignment || '').toLowerCase().includes(q);
      const dateMatch = (req.date_created || '').includes(q);
      const compMatch = comp.toLowerCase().includes(q);
      const itemsMatch = (req.items || []).some(it => 
        (it.product || '').toLowerCase().includes(q) || 
        (it.supplier || '').toLowerCase().includes(q)
      );
      return orderMatch || requesterMatch || assignmentMatch || dateMatch || itemsMatch || compMatch;
    });
  }, [requests, trackingFilter, trackingSearch, companyFilter]);

  const totalTrackingPages = Math.ceil(orderTrackingRequests.length / itemsPerPage) || 1;

  const paginatedOrders = useMemo(() => {
    return orderTrackingRequests.slice(
      (trackingPage - 1) * itemsPerPage,
      trackingPage * itemsPerPage
    );
  }, [orderTrackingRequests, trackingPage, itemsPerPage]);

  const renderPagination = (currentPage, totalPages, onPageChange, totalItems, label = "éléments") => {
    if (totalItems === 0) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }

    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
        paddingTop: '0.85rem',
        borderTop: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Affichage de <strong>{startIdx}</strong> à <strong>{endIdx}</strong> sur <strong>{totalItems}</strong> {label}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.45 : 1
              }}
            >
              <ChevronLeft size={14} />
              <span>Précédent</span>
            </button>

            {pages.map((p, idx) => (
              p === '...' ? (
                <span key={idx} style={{ padding: '0 0.25rem', color: '#94a3b8', fontSize: '0.8rem' }}>...</span>
              ) : (
                <button
                  key={idx}
                  type="button"
                  className={`btn ${currentPage === p ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => onPageChange(p)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    minWidth: '30px',
                    backgroundColor: currentPage === p ? 'var(--color-primary)' : 'transparent',
                    color: currentPage === p ? '#ffffff' : 'var(--color-text)',
                    borderColor: currentPage === p ? 'var(--color-primary)' : '#cbd5e1'
                  }}
                >
                  {p}
                </button>
              )
            ))}

            <button
              type="button"
              className="btn btn-outline"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.45 : 1
              }}
            >
              <span>Suivant</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };
 
  const handleDownloadRequest = (req) => {
    const comp = getRequestCompany(req);
    const city = req.requester_city || req.city || '';
    const isSomabus = comp === 'SOMABUS';
    const isCkd = comp === 'CKD';
    const isSuccursale = comp === 'Succursale';

    // Nom du document lorsqu'il est téléchargé / enregistré au format PDF
    const docTitle = `Demande_Achat_${isSuccursale ? ('Succursale_' + (city || '')) : comp}_${req.order_number}`;
    const companyLogo = isSomabus ? '/somabus_logo.png' : '/logo.png';
    const companyDisplayName = isSomabus ? 'SOMABUS' : isCkd ? 'CKD' : isSuccursale ? `Succursale MAN Truck & Bus${city ? ' - ' + city : ''}` : 'MAN Truck & Bus Maroc (SEFAMAR)';

    const itemsHtml = (req.items || []).map(it => `
      <tr>
        <td style="font-weight: 600; color: #0f172a;">${it.product}</td>
        <td style="text-align: center; font-weight: 600;">${it.qty}</td>
      </tr>
    `).join('');
    
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #000000;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              height: 75px;
              max-height: 85px;
              max-width: 280px;
              object-fit: contain;
            }
            .title {
              text-align: right;
            }
            .title h1 {
              margin: 0;
              font-size: 26px;
              font-weight: 800;
              color: #000000;
              letter-spacing: -0.025em;
            }
            .title .company-tag {
              font-size: 14px;
              font-weight: 800;
              color: #000000;
              margin-top: 4px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .title p {
              margin: 5px 0 0 0;
              color: #222222;
              font-size: 14px;
              font-weight: 600;
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
              font-weight: 800;
              color: #000000;
              border-bottom: 1.5px solid #000000;
              padding-bottom: 8px;
              margin-bottom: 12px;
              letter-spacing: 0.05em;
            }
            .detail-item {
              margin-bottom: 8px;
              font-size: 14px;
              color: #000000;
            }
            .detail-item strong {
              color: #000000;
            }
            .detail-item span {
              font-weight: 600;
              color: #000000;
            }
            .table-request {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 50px;
            }
            .table-request th {
              background-color: #f1f5f9;
              color: #000000;
              font-weight: 800;
              font-size: 11px;
              text-transform: uppercase;
              text-align: left;
              padding: 12px;
              border-bottom: 2px solid #000000;
              letter-spacing: 0.05em;
            }
            .table-request td {
              padding: 16px 12px;
              border-bottom: 1px solid #cbd5e1;
              font-size: 14px;
              color: #000000;
            }
            .observation-box {
              background-color: #f8fafc;
              border: 1px solid #000000;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 40px;
              font-size: 14px;
              color: #000000;
            }
            .signature-box {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 100px;
              padding: 0 20px;
            }
            .signature {
              border-top: 1.5px dashed #000000;
              text-align: center;
              padding-top: 10px;
              font-size: 12px;
              font-weight: 700;
              color: #000000;
            }
            .footer-request {
              margin-top: 50px;
              border-top: 1px solid #000000;
              padding-top: 20px;
              text-align: center;
              font-size: 11px;
              color: #333333;
              font-weight: 400;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="${companyLogo}" alt="${companyDisplayName} Logo" />
            <div class="title">
              <h1>DEMANDE D'ACHAT</h1>
              <div class="company-tag">${companyDisplayName}</div>
              <p>Référence : ${req.order_number}</p>
            </div>
          </div>
          
          <div class="details-grid">
            <div>
              <div class="section-title">Émetteur</div>
              <div class="detail-item"><strong>${companyDisplayName}</strong></div>
              <div class="detail-item">Demandeur : <span>${req.requester_name}</span></div>
              <div class="detail-item">Affectation : <span>${req.assignment || 'Non spécifiée'}</span></div>
            </div>
            <div>
              <div class="section-title">Détails de la Demande</div>
              <div class="detail-item">Société : <span>${comp}</span></div>
              <div class="detail-item">Date d'enregistrement : <span>${req.date_created}</span></div>
              <div class="detail-item">Validation : <span>${req.is_validated ? `Validé (${req.validated_by_name || 'Achats'})` : (req.requester_name && req.requester_name.toLowerCase().includes('compta')) ? 'Feuille papier signée' : 'En attente'}</span></div>
            </div>
          </div>

          <div class="section-title">Description des Articles Demandés</div>
          <table class="table-request">
            <thead>
              <tr>
                <th>Désignation Article</th>
                <th style="text-align: center; width: 150px;">Quantité</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${req.observation ? `
            <div class="section-title">Observations</div>
            <div class="observation-box">
              ${req.observation}
            </div>
          ` : ''}

          <div class="footer-request">
            <p>Ce document est une fiche de demande d'achat interne émise électroniquement par le système de gestion des achats (${companyDisplayName}).</p>
            <p>&copy; ${new Date().getFullYear()} ${companyDisplayName}. Tous droits réservés.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
        is_validated: true,
        validated_by: parseInt(userId || '1'),
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

      {/* Barre de filtrage par Entreprise */}
      <div className="card mb-4" style={{ padding: '0.85rem 1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: '#0f172a' }} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Filtrer par Entreprise :</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'Tous', label: 'Toutes les demandes', count: companyCounts.Tous, pending: pendingCompanyCounts.Tous },
              { id: 'SEFAMAR', label: 'SEFAMAR (MAN Maroc)', count: companyCounts.SEFAMAR, pending: pendingCompanyCounts.SEFAMAR },
              { id: 'SOMABUS', label: 'SOMABUS', count: companyCounts.SOMABUS, pending: pendingCompanyCounts.SOMABUS },
              { id: 'CKD', label: 'CKD', count: companyCounts.CKD, pending: pendingCompanyCounts.CKD },
              { id: 'Succursale', label: 'Succursales (Villes)', count: companyCounts.Succursale, pending: pendingCompanyCounts.Succursale },
            ].map(tab => {
              const isActive = companyFilter === tab.id;
              const isSoma = tab.id === 'SOMABUS';
              const isSucc = tab.id === 'Succursale';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCompanyFilter(tab.id);
                    setTrackingPage(1);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: isActive ? 700 : 500,
                    border: isActive 
                      ? (isSoma ? '2px solid #b45309' : isSucc ? '2px solid #0d9488' : '2px solid #0f172a') 
                      : '1px solid #cbd5e1',
                    backgroundColor: isActive 
                      ? (isSoma ? '#fef3c7' : isSucc ? '#ccfbf1' : '#0f172a') 
                      : '#f8fafc',
                    color: isActive 
                      ? (isSoma ? '#92400e' : isSucc ? '#0f766e' : '#ffffff') 
                      : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                    backgroundColor: isActive 
                      ? (isSoma ? '#fde68a' : isSucc ? '#99f6e4' : 'rgba(255,255,255,0.25)') 
                      : '#e2e8f0',
                    color: isActive 
                      ? (isSoma ? '#78350f' : isSucc ? '#0f766e' : '#ffffff') 
                      : '#475569'
                  }}>
                    {tab.pending > 0 ? `${tab.pending} en attente` : `${tab.count}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 style={{ margin: 0 }}>
              Demandes d'achat (En attente) {companyFilter !== 'Tous' && <span style={{ color: companyFilter === 'SOMABUS' ? '#b45309' : '#1d4ed8' }}>— {companyFilter}</span>}
            </h3>
            <span style={{ fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 600, border: '1px solid #fde68a' }}>
              {filteredRequests.length} demande(s)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Rechercher par N°, demandeur, produit..." 
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
              }}
              className="form-input" 
              style={{ paddingLeft: '2.5rem', width: '280px' }}
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
                  <th>Société</th>
                  <th>Date</th>
                  <th>Demandeur</th>
                  <th>Produits (Qté)</th>
                  <th>Affectation</th>
                  <th>Validation</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{req.order_number}</div>
                      {req.requester_name && req.requester_name.toLowerCase().includes('compta') && (
                        <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.68rem', marginTop: '0.25rem', display: 'inline-block' }}>
                          📑 Validation Papier
                        </span>
                      )}
                      {req.request_pdf && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <a 
                            href={getMediaUrl(req.request_pdf)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: '#1d4ed8', 
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.3rem', 
                              textDecoration: 'none' 
                            }}
                            title="Consulter la pièce jointe ou feuille signée"
                          >
                            <FileText size={12} />
                            <span>{req.requester_name && req.requester_name.toLowerCase().includes('compta') ? 'Voir feuille signée' : 'Voir pièce(s) jointe(s)'}</span>
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      {renderCompanyBadge(getRequestCompany(req), req)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                        {formatDate(req.date_created)}
                      </div>
                      {getRelativeDelay(req.date_created) && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          {getRelativeDelay(req.date_created)}
                        </div>
                      )}
                    </td>
                    <td>{req.requester_name}</td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                        {req.items && req.items.map((it, idx) => (
                          <li key={idx}><strong>{it.qty}x</strong> {it.product}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>{req.assignment}</td>
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
                      ) : (req.requester_name && req.requester_name.toLowerCase().includes('compta')) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
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
                            Feuille signée reçue
                          </span>
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem', borderColor: '#16a34a', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f0fdf4' }}
                            onClick={() => handleValidatePaper(req.id)}
                            title="Confirmer la validation de la feuille signée reçue"
                          >
                            <Check size={12} /> Valider la signature
                          </button>
                        </div>
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

                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }} 
                          onClick={() => handleDownloadRequest(req)} 
                          title="Télécharger / Imprimer la Demande PDF"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      {filter ? "Aucune demande ne correspond à votre recherche." : "Aucune demande en attente."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card mb-6" style={{ width: '100%' }}>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 style={{ margin: 0 }}>Suivi des Commandes</h3>
            <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
              {orderTrackingRequests.length} commande(s)
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)' }} />
              <input 
                type="text" 
                placeholder="Rechercher par N°, fournisseur, produit..." 
                value={trackingSearch}
                onChange={(e) => {
                  setTrackingSearch(e.target.value);
                  setTrackingPage(1);
                }}
                className="form-input" 
                style={{ paddingLeft: '2.5rem', width: '280px' }}
              />
            </div>

            <div className="flex gap-1" style={{ backgroundColor: 'var(--color-bg)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              {['Tous', 'Commandé', 'Reçu'].map(status => (
                <button
                  key={status}
                  type="button"
                  className={`btn ${trackingFilter === status ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: trackingFilter === status ? 'var(--color-primary)' : 'transparent',
                    color: trackingFilter === status ? '#ffffff' : 'var(--color-text)',
                    boxShadow: 'none'
                  }}
                  onClick={() => {
                    setTrackingFilter(status);
                    setTrackingPage(1);
                  }}
                >
                  {status === 'Tous' ? 'Tous' : status === 'Commandé' ? 'Commandées' : 'Reçues'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Chargement du suivi...</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Société</th>
                  <th>Date</th>
                  <th>Demandeur</th>
                  <th>Produits</th>
                  <th>Fournisseurs</th>
                  <th>Prix Total</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(order => {
                  const orderTotal = (order.items || []).reduce((sum, it) => {
                    const up = parseFloat((it.price || '0').replace(/[^0-9.]/g, '')) || 0;
                    return sum + (up * (parseInt(it.qty, 10) || 1));
                  }, 0);

                  return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{order.order_number}</div>
                      {order.request_pdf && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <a 
                            href={getMediaUrl(order.request_pdf)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: '#1d4ed8', 
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.3rem', 
                              textDecoration: 'none' 
                            }}
                            title="Consulter la pièce jointe ou feuille signée"
                          >
                            <FileText size={12} />
                            <span>{order.requester_name && order.requester_name.toLowerCase().includes('compta') ? 'Feuille Signée' : 'Pièce(s) Jointe(s)'}</span>
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      {renderCompanyBadge(getRequestCompany(order), order)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                        {formatDate(order.date_created)}
                      </div>
                      {getRelativeDelay(order.date_created) && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          {getRelativeDelay(order.date_created)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                        {order.requester_name || '-'}
                      </div>
                    </td>
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
                        const qty = parseInt(it.qty, 10) || 1;
                        const total = up * qty;
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
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          onClick={() => {
                            setDetailsRequest(order);
                            setIsDetailsModalOpen(true);
                          }}
                          title="Voir les détails de la demande"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          onClick={() => handleDownloadRequest(order)} 
                          title="Télécharger / Imprimer la Demande PDF"
                        >
                          <Download size={14} />
                        </button>
                        {order.status === 'Commandé' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleMarkReceived(order.id)}
                          >
                            Marquer Reçu
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
                {orderTrackingRequests.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      {trackingSearch ? "Aucune commande ne correspond à votre recherche." : "Aucune commande en cours de suivi."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {renderPagination(trackingPage, totalTrackingPages, setTrackingPage, orderTrackingRequests.length, "commande(s)")}
          </div>
        )}
      </div>
 
      {/* Card - Reporting */}
      <div className="card mb-6" style={{ maxWidth: '400px' }}>
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
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  className="btn btn-outline" 
                  onClick={() => handleDownloadRequest(selectedRequest)} 
                  title="Télécharger / Imprimer la Demande PDF"
                  style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                >
                  <Download size={13} />
                  Télécharger la demande
                </button>
                <button className="btn btn-outline" onClick={() => setIsApproveModalOpen(false)} style={{ padding: '0.25rem' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <form onSubmit={handleConfirmOrder}>
              {selectedRequest?.request_pdf && (
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#1e40af', fontSize: '0.85rem' }}>
                    <FileText size={18} />
                    <div>
                      <strong>Pièce jointe / feuille signée disponible</strong>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Vérifiez les documents transmis avant de commander</div>
                    </div>
                  </div>
                  <a 
                    href={getMediaUrl(selectedRequest.request_pdf)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ 
                      padding: '0.35rem 0.75rem', 
                      fontSize: '0.75rem', 
                      borderColor: '#2563eb', 
                      color: '#2563eb', 
                      backgroundColor: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Eye size={13} /> Consulter le document joint
                  </a>
                </div>
              )}
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

      {/* Modal - Détails de la commande */}
      {isDetailsModalOpen && detailsRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Détails de la Commande ({detailsRequest.order_number})</h3>
              <button className="btn btn-outline" onClick={() => setIsDetailsModalOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="grid grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p className="text-xs text-muted">Société</p>
                  <div>{renderCompanyBadge(getRequestCompany(detailsRequest))}</div>
                </div>
                <div>
                  <p className="text-xs text-muted">Demandeur</p>
                  <p style={{ fontWeight: 600 }}>{detailsRequest.requester_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Affectation</p>
                  <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{detailsRequest.assignment}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Date de Création</p>
                  <p style={{ fontWeight: 600 }}>{detailsRequest.date_created}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Validation</p>
                  <p style={{ fontWeight: 600 }}>
                    {detailsRequest.is_validated 
                      ? `Validé par ${detailsRequest.validated_by_name === 'man@sefamar.ma' ? 'Mme EL MANSOURI' : detailsRequest.validated_by_name === 'chadi@sefamar.ma' ? 'Chadi Ismail' : detailsRequest.validated_by_name === 'obelkadi.man@sefamar.ma' ? 'O. BELKADI (Commercial)' : detailsRequest.validated_by_name === 'g.benelhassane@sefamar.ma' ? 'Mme BENELHASSANE' : detailsRequest.validated_by_name}` 
                      : 'Non validé'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Statut</p>
                  <span className={`badge badge-${detailsRequest.status === 'Commandé' ? 'ordered' : 'received'}`}>
                    {detailsRequest.status}
                  </span>
                </div>
              </div>

              {detailsRequest.request_pdf && (
                <div style={{ backgroundColor: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-muted mb-0">
                      {detailsRequest.requester_name && detailsRequest.requester_name.toLowerCase().includes('compta')
                        ? 'Photo / Scan de la Feuille Signée (Comptabilité)'
                        : 'Document de Demande Joint'}
                    </p>
                    <a 
                      href={getMediaUrl(detailsRequest.request_pdf)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ExternalLink size={13} />
                      <span>Ouvrir en plein écran</span>
                    </a>
                  </div>
                  {(!detailsRequest.request_pdf.toLowerCase().endsWith('.pdf')) && (
                    <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                      <img 
                        src={getMediaUrl(detailsRequest.request_pdf)} 
                        alt="Feuille de demande signée" 
                        style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }} 
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-muted mb-2">Articles commandés</p>
                <div className="table-container">
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th>Fournisseur</th>
                        <th style={{ textAlign: 'center' }}>Quantité</th>
                        <th style={{ textAlign: 'right' }}>Prix Unitaire</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsRequest.items && detailsRequest.items.map((it, idx) => {
                        const up = parseFloat((it.price || '0').replace(/[^0-9.]/g, '')) || 0;
                        const total = up * it.qty;
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 500 }}>{it.product}</td>
                            <td>{it.supplier || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{it.qty}</td>
                            <td style={{ textAlign: 'right' }}>{it.price || '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{total.toLocaleString('fr-FR')} MAD</td>
                          </tr>
                        );
                      })}
                      <tr style={{ fontWeight: 700, backgroundColor: 'var(--color-bg)' }}>
                        <td colSpan="4" style={{ textAlign: 'right' }}>Montant Total Net :</td>
                        <td style={{ textAlign: 'right', color: '#e11d48' }}>
                          {(detailsRequest.items || []).reduce((acc, it) => {
                            const up = parseFloat((it.price || '0').replace(/[^0-9.]/g, '')) || 0;
                            return acc + (up * it.qty);
                          }, 0).toLocaleString('fr-FR')} MAD
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {detailsRequest.observation && (
                <div>
                  <p className="text-xs text-muted">Observation</p>
                  <p style={{ fontStyle: 'italic', backgroundColor: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    {detailsRequest.observation}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-6">
              <button 
                type="button"
                className="btn btn-outline" 
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }} 
                onClick={() => handleDownloadRequest(detailsRequest)}
              >
                <Download size={16} />
                Télécharger / Imprimer la Demande PDF
              </button>
              <button className="btn btn-outline" onClick={() => setIsDetailsModalOpen(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchasingDashboard;
