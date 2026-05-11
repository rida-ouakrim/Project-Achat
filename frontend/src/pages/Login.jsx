import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { loginUser } from '../api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Tentative de connexion via le backend sécurisé Django
      const response = await loginUser(username.trim(), password);
      const user = response.data;

      if (user) {
        const role = user.profile ? user.profile.role : 'requester';
        
        // Sauvegarder les informations réelles en session local
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', user.username);
        
        // Redirection
        if (role === 'requester') navigate('/requester');
        else if (role === 'purchasing') navigate('/purchasing');
        else if (role === 'director') navigate('/director');
      }
    } catch (err) {
      console.error("Erreur Auth:", err);
      if (err.response && err.response.status === 401) {
        setError("Nom d'utilisateur ou mot de passe incorrect.");
      } else {
        setError("Erreur de connexion au serveur central.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.7)), url("/man-lkw-family-stage-maroc.jpeg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '2.5rem', 
        textAlign: 'center',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)'
      }}>
        <img 
          src="/logo.png" 
          alt="MAN Logo" 
          style={{ height: '60px', objectFit: 'contain', marginBottom: '1.5rem', margin: '0 auto' }} 
        />
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Connexion</h2>
        <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
          Système Officiel de Gestion des Achats - MAN
        </p>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.8125rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: ali, othmane, dg" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Mot de passe</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            disabled={loading}
          >
            <LogIn size={18} />
            {loading ? 'Connexion en cours...' : 'Se Connecter'}
          </button>
          
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            🔒 Mot de passe oublié ? Contactez votre <strong>Direction</strong> pour une réinitialisation.
          </p>
        </form>


      </div>
    </div>
  );
};

export default Login;
