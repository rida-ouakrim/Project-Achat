import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle, AlertTriangle, History, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import API, { fetchQuoteComparisonHistory, deleteQuoteComparisonHistory } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const QuoteComparisonDashboard = () => {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [files, setFiles] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  // History States
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Progress Loader States
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  // Dynamic progress bar logic
  useEffect(() => {
    if (loading) {
      setProgress(0);
      // Fast step then decay
      progressIntervalRef.current = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 98) return 98;

          const diff = 100 - prevProgress;
          // Slower rate than sourcing since OCR takes chunk steps
          const step = Math.max(1, Math.floor(diff * 0.05));
          return prevProgress + step;
        });
      }, 1500); // Tick every 1.5 seconds
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (progress > 0) {
        setProgress(100);
        const t = setTimeout(() => setProgress(0), 800);
        return () => clearTimeout(t);
      }
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [loading]);

  const userId = localStorage.getItem('userId');

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetchQuoteComparisonHistory(userId);
      setHistoryList(response.data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
      toast.error("Impossible de charger l'historique.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation(); // Évite la sélection de l'élément dans la liste
    
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette analyse de l'historique ?")) {
      const toastId = toast.loading("Suppression en cours...");
      try {
        await deleteQuoteComparisonHistory(id);
        toast.success("Analyse supprimée avec succès !", { id: toastId });
        
        // Si l'élément supprimé était celui sélectionné, on réinitialise la sélection
        if (selectedHistoryItem?.id === id) {
          setSelectedHistoryItem(null);
        }
        
        // Recharger la liste d'historique
        loadHistory();
      } catch (err) {
        console.error("Error deleting history:", err);
        toast.error("Impossible de supprimer cette analyse.", { id: toastId });
      }
    }
  };

  // Trigger history load on tab active
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      // Si l'image fait moins de 150 Ko, on ne la compresse pas
      if (file.size < 150 * 1024) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Limites pour conserver la lisibilité du texte tout en allégeant le fichier
          const MAX_WIDTH = 2000;
          const MAX_HEIGHT = 2000;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.85); // 0.85 conserve le texte net tout en réduisant le poids de 90%
        };
      };
    });
  };

  const addFiles = async (newFiles) => {
    const validFiles = newFiles.filter(f =>
      f.type === 'application/pdf' ||
      f.type.startsWith('image/')
    );

    if (validFiles.length !== newFiles.length) {
      toast.error("Certains fichiers ont été ignorés (uniquement PDF, JPG, PNG).");
    }

    // Notification de traitement si des fichiers sont lourds
    const hasHeavyFiles = validFiles.some(f => f.size > 1024 * 1024 && f.type.startsWith('image/'));
    let toastId = null;
    if (hasHeavyFiles) {
      toastId = toast.loading("Optimisation et compression des images lourdes...");
    }

    try {
      const processedFiles = await Promise.all(
        validFiles.map(async (file) => {
          if (file.type.startsWith('image/')) {
            return await compressImage(file);
          }
          return file;
        })
      );
      setFiles(prev => [...prev, ...processedFiles]);
      if (toastId) toast.dismiss(toastId);
    } catch (err) {
      console.error("Compression error:", err);
      setFiles(prev => [...prev, ...validFiles]);
      if (toastId) toast.dismiss(toastId);
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleCompare = async () => {
    if (files.length < 2) {
      return toast.error("Veuillez ajouter au moins 2 documents (devis) pour comparer.");
    }

    setLoading(true);
    setResult('');

    const formData = new FormData();
    files.forEach(f => {
      formData.append('files', f);
    });
    if (instructions.trim()) {
      formData.append('instructions', instructions.trim());
    }
    if (userId) {
      formData.append('user_id', userId);
    }

    try {
      const response = await API.post('ai/compare-quotes/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000 // 3 minutes
      });

      if (response.data.success) {
        setResult(response.data.markdown);
        toast.success("Comparaison terminée avec succès !");
      } else {
        toast.error("Erreur de l'IA: " + response.data.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'analyse OCR et IA. Les fichiers sont peut-être trop lourds.");
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
    <div className="quote-comparison-dashboard">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-loader {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
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
        .history-card-item {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        .history-card-item:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }
        .history-card-item.selected {
          border-color: #2563eb;
          background-color: #eff6ff;
        }
        
        /* Styles de rendu Premium pour le rapport comparatif Markdown */
        .markdown-container {
          padding: 1.5rem;
          background-color: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .markdown-container h1, .markdown-container h2, .markdown-container h3 {
          color: #0f172a;
          font-weight: 700;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
        }
        .markdown-container h2 {
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 0.5rem;
          font-size: 1.35rem;
        }
        .markdown-container p {
          margin-bottom: 1rem;
          color: #475569;
          line-height: 1.7;
        }
        .markdown-container table {
          display: block;
          width: 100%;
          overflow-x: auto;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.875rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .markdown-container th {
          background-color: #1e293b;
          color: white;
          text-align: left;
          font-weight: 600;
          padding: 0.875rem 1rem;
          border-bottom: 2px solid #cbd5e1;
        }
        .markdown-container td {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          background-color: white;
          color: #334155;
        }
        .markdown-container tr:last-child td {
          border-bottom: none;
        }
        .markdown-container tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .markdown-container ul, .markdown-container ol {
          margin-left: 1.5rem;
          margin-bottom: 1.25rem;
          color: #475569;
        }
        .markdown-container li {
          margin-bottom: 0.35rem;
          line-height: 1.6;
        }
        .markdown-container blockquote {
          border-left: 4px solid #3b82f6;
          background-color: #f0f7ff;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
          border-radius: 0 8px 8px 0;
          color: #1e40af;
          font-weight: 500;
        }
        
        /* Grille adaptative Premium pour terminaux mobiles */
        .grid-responsive {
          display: grid !important;
          grid-template-columns: 1fr 2fr !important;
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span> Comparaison de Devis IA
          </h2>
          <p className="text-sm text-muted" style={{ margin: '4px 0 0 0' }}>Extraction automatique et analyse comparative intelligente de devis multiples.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b mb-6" style={{ borderColor: '#e2e8f0' }}>
        <button
          className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UploadCloud size={18} />
          Nouvelle Analyse
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <History size={18} />
          Historique des Analyses
        </button>
      </div>

      <div className="grid-responsive">

        {/* COLONNE DE GAUCHE (DYNAMIQUE SELON L'ONGLET) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {activeTab === 'new' ? (
            <>
              {/* COMPONENT: UPLOAD BOX */}
              <div className="card" style={{ marginBottom: 0 }}>
                <h3 className="mb-4">1. Ajouter les devis</h3>

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{
                    border: '2px dashed var(--color-primary-light, #bfdbfe)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <UploadCloud size={32} color="var(--color-primary)" style={{ margin: '0 auto 1rem auto', color: '#2563eb' }} />
                  <p style={{ fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Glissez-déposez vos fichiers ici</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Supporte: PDF, JPG, PNG</p>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf, image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>

                {files.length > 0 && (
                  <div className="mt-4">
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#475569' }}>Fichiers sélectionnés ({files.length}) :</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {files.map((f, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', overflow: 'hidden' }}>
                            <FileText size={14} color="#2563eb" />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{f.name}</span>
                          </div>
                          <button onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}>
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Consignes particulières pour l'IA */}
                <div className="mt-4">
                  <label htmlFor="instructions" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>
                    💡 Consignes particulières pour l'IA (optionnel)
                  </label>
                  <textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Exemple : Compare les offres globales d'ESR et Fournipro contenant à la fois 2 PC et 3 imprimantes, et mets en évidence les différences..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      color: '#334155',
                      backgroundColor: 'white',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                <button
                  className="btn btn-primary w-full mt-6"
                  onClick={handleCompare}
                  disabled={files.length < 2 || loading}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {loading ? 'Analyse en cours...' : 'Lancer la Comparaison'}
                </button>
              </div>

              <div className="card" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7', marginBottom: 0 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={16} /> Note Importante
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
                  Ce processus extrait les informations clés de vos documents de devis pour générer un tableau comparatif structuré. L'analyse se sauvegardera automatiquement dans votre historique.
                </p>
              </div>
            </>
          ) : (
            /* COMPONENT: HISTORY SELECTOR */
            <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '450px' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Analyses Récentes</h3>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <Loader2 size={28} className="animate-spin mx-auto mb-2" style={{ color: '#2563eb' }} />
                  <p style={{ fontSize: '0.875rem' }}>Chargement de l'historique...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <History size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.875rem' }}>Aucune comparaison de devis enregistrée pour le moment.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '500px', paddingRight: '4px' }}>
                  {historyList.map((item) => {
                    const isSelected = selectedHistoryItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`history-card-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedHistoryItem(item)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.75rem' }}>
                            <Calendar size={12} />
                            {formatDate(item.created_at)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={(e) => handleDeleteHistory(e, item.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s',
                              }}
                              title="Supprimer cette analyse"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Trash2 size={14} />
                            </button>
                            {isSelected && <ArrowRight size={14} color="#2563eb" />}
                          </div>
                        </div>
                        <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0', color: isSelected ? '#1e40af' : '#1e293b', wordBreak: 'break-all' }}>
                          {item.filenames?.length} Fichier{item.filenames?.length > 1 ? 's' : ''} comparé{item.filenames?.length > 1 ? 's' : ''}
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {item.filenames?.slice(0, 2).map((name, i) => (
                            <span key={i} style={{ fontSize: '0.6875rem', backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                              {name}
                            </span>
                          ))}
                          {item.filenames?.length > 2 && (
                            <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>+{item.filenames.length - 2} de plus</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLONNE DE DROITE : AFFICHAGE DU RÉSULTAT OU CHARGEMENT DYNAMIQUE */}
        <div className="card" style={{ marginBottom: 0, minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="mb-4" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            {activeTab === 'new' ? "Résultat de l'Analyse Actuelle" : "Lecture de l'Historique"}
          </h3>

          {activeTab === 'new' ? (
            /* Render search result */
            loading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                {/* Header with Circular loader & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem', backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px dashed #bfdbfe' }}>
                  <div style={{ position: 'relative', width: '72px', height: '72px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={60} className="animate-spin" style={{ color: '#2563eb', opacity: 0.2, position: 'absolute' }} />
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e3a8a', zIndex: 2 }}>
                      {progress}%
                    </div>
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                      <path
                        style={{ stroke: '#2563eb', strokeDasharray: `${progress}, 100`, strokeWidth: '2.5', fill: 'none', strokeLinecap: 'round', transition: 'stroke-dasharray 0.5s ease' }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e3a8a', margin: '0 0 0.5rem 0' }}>Analyse & Comparaison en cours...</h3>
                  <p style={{ color: '#3b82f6', maxWidth: '500px', fontSize: '0.875rem', margin: '0 auto 1rem auto' }}>
                    Lecture et analyse automatique de <strong>{files.length} document{files.length > 1 ? 's' : ''}</strong>.
                  </p>

                  {/* Linear Percentage Bar */}
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

                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', fontWeight: 500 }}>
                    {progress < 25 ? "Chargement des documents sur le serveur..." :
                      progress < 55 ? "Extraction des données textuelles et financières..." :
                        progress < 85 ? "Génération du tableau comparatif intelligent..." :
                          "Finalisation du rapport comparatif..."}
                  </div>
                </div>

                {/* Skeleton Table Preview for User Assurance */}
                <h4 style={{ marginBottom: '1rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.875rem' }}>Reconstruction du tableau comparatif...</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Table Header Skeleton */}
                  <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                    <div className="skeleton-loader" style={{ height: '16px', width: '30%', borderRadius: '4px' }}></div>
                    <div className="skeleton-loader" style={{ height: '16px', width: '35%', borderRadius: '4px' }}></div>
                    <div className="skeleton-loader" style={{ height: '16px', width: '35%', borderRadius: '4px' }}></div>
                  </div>
                  {/* Table Body Row Skeletons */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                      <div style={{ width: '30%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="skeleton-loader" style={{ height: '14px', width: '80%', borderRadius: '4px' }}></div>
                      </div>
                      <div style={{ width: '35%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="skeleton-loader" style={{ height: '12px', width: '90%', borderRadius: '4px' }}></div>
                        <div className="skeleton-loader" style={{ height: '12px', width: '60%', borderRadius: '4px' }}></div>
                      </div>
                      <div style={{ width: '35%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="skeleton-loader" style={{ height: '12px', width: '85%', borderRadius: '4px' }}></div>
                        <div className="skeleton-loader" style={{ height: '12px', width: '50%', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : result ? (
              <div className="markdown-container animate-fadeIn" style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#334155' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ fontWeight: 500 }}>Aucune analyse effectuée.</p>
                <p style={{ fontSize: '0.8125rem' }}>Chargez vos devis à gauche puis lancez la comparaison.</p>
              </div>
            )
          ) : (
            /* Render selected history result */
            selectedHistoryItem ? (
              <div className="markdown-container animate-fadeIn" style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#334155' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <div><strong>Date :</strong> {formatDate(selectedHistoryItem.created_at)}</div>
                  <div><strong>Fichiers :</strong> {selectedHistoryItem.filenames?.join(', ')}</div>
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedHistoryItem.markdown_result}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ fontWeight: 500 }}>Aucune archive sélectionnée.</p>
                <p style={{ fontSize: '0.8125rem' }}>Choisissez une comparaison dans la liste à gauche pour la consulter.</p>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default QuoteComparisonDashboard;
