import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit2, Trash2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCatalog, createCatalog, updateCatalog, deleteCatalog } from '../api';

const SuppliersPage = () => {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // New state for custom delete modal
  
  // Form States
  const [prodName, setProdName] = useState('');
  const [suppName, setSuppName] = useState('');
  const [price, setPrice] = useState('');

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetchCatalog();
      setCatalog(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleOpenEditor = (item = null) => {
    if (item) {
      setEditingItem(item);
      setProdName(item.product_name);
      setSuppName(item.supplier_name);
      setPrice(item.price.replace(/[^0-9.]/g, ''));
    } else {
      setEditingItem(null);
      setProdName('');
      setSuppName('');
      setPrice('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const data = {
      product_name: prodName,
      supplier_name: suppName,
      price: `${price} MAD`
    };
    try {
      if (editingItem) {
        await updateCatalog(editingItem.id, data);
        toast.success("Référencement mis à jour !");
      } else {
        await createCatalog(data);
        toast.success("Nouveau produit ajouté au catalogue !");
      }
      setIsModalOpen(false);
      loadCatalog();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id); // Opens custom confirmation modal
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteCatalog(deleteConfirmId);
      toast.success("Référence supprimée avec succès.");
      setDeleteConfirmId(null);
      loadCatalog();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Impossible de supprimer cette ligne.");
    }
  };

  const filteredCatalog = catalog.filter(c => 
    c.product_name.toLowerCase().includes(filter.toLowerCase()) ||
    c.supplier_name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Catalogue des Fournisseurs</h2>
            <p className="text-sm text-muted">Gestion centralisée des tarifs et prestataires référencés.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="btn btn-outline" onClick={() => loadCatalog()} title="Actualiser">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenEditor(null)}>
            <Plus size={18} />
            Ajouter un Nouveau Tarif
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: '1rem', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Rechercher un produit ou fournisseur..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Chargement...</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Désignation Produit</th>
                  <th>Nom du Fournisseur</th>
                  <th>Prix Unitaire Actuel</th>
                  <th>Dernière Mise à Jour</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{item.supplier_name}</td>
                    <td>
                      <span style={{ 
                        backgroundColor: '#f0fdf4', 
                        color: '#166534', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        border: '1px solid #dcfce7'
                      }}>
                        {item.price}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                      {new Date(item.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2 justify-end">
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleOpenEditor(item)} title="Éditer">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => handleDelete(item.id)} title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCatalog.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      Aucune donnée trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Formulaire */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingItem ? "Modifier l'entrée du catalogue" : "Nouveau Référencement"}</h3>
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Produit / Article</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Huile moteur 10W40"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Fournisseur</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  placeholder="Ex: TOTAL MAROC"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prix Unitaire Référent (MAD)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 350.00"
                  step="any"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? "Enregistrer les modifications" : "Créer l'entrée"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Confirmation Delete Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              backgroundColor: '#fee2e2', 
              color: '#ef4444', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}>
              <Trash2 size={24} />
            </div>
            
            <h3 style={{ marginBottom: '0.5rem' }}>Confirmer la suppression</h3>
            <p style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
              Êtes-vous sûr de vouloir retirer définitivement cette référence du catalogue ? Cette action est irréversible.
            </p>

            <div className="flex gap-3 justify-center">
              <button className="btn btn-outline" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1 }}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={executeDelete} style={{ flex: 1 }}>
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
