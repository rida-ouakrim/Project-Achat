import axios from 'axios';

const API = axios.create({
  baseURL: window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:8000/api/'
    : '/api/',
});

// Intercepteur pour injecter automatiquement le token d'accès JWT dans toutes les requêtes
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        };
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour intercepter les erreurs 401 et rafraîchir automatiquement le token d'accès
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si l'erreur est un code 401 (non autorisé) et que ce n'est pas déjà un retry
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Demander un nouveau token d'accès avec le token de rafraîchissement
          const response = await axios.post(
            (window.location.hostname === 'localhost' && window.location.port === '5173'
              ? 'http://localhost:8000/api/'
              : '/api/') + 'token/refresh/',
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem('accessToken', access);

          // Mettre à jour l'en-tête de la requête originale et la relancer
          if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${access}`);
          } else {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${access}`
            };
          }
          return API(originalRequest);
        } catch (refreshError) {
          // Si le token de rafraîchissement a expiré aussi, déconnexion complète
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const fetchUsers = () => API.get('users/');
export const loginUser = (username, password) => API.post('users/login/', { username, password });
export const createUser = (data) => API.post('users/', data);
export const resetUserPassword = (id, password) => API.post(`users/${id}/reset_password/`, { password });
export const fetchRequests = () => API.get('requests/');
export const createRequest = (data) => API.post('requests/', data);
export const updateRequest = (id, data) => API.patch(`requests/${id}/`, data);
export const deleteRequest = (id) => API.delete(`requests/${id}/`);
export const fetchCatalog = (productName = '') => {
  const url = productName ? `catalog/?product_name=${encodeURIComponent(productName)}` : 'catalog/';
  return API.get(url);
};
export const createCatalog = (data) => API.post('catalog/', data);
export const updateCatalog = (id, data) => API.patch(`catalog/${id}/`, data);
export const deleteCatalog = (id) => API.delete(`catalog/${id}/`);

export const sendMessageToAI = (message) => API.post('chat/', { message });

export const fetchSourcingHistory = () => API.get('sourcing-history/');
export const fetchQuoteComparisonHistory = () => API.get('quote-comparison-history/');
export const deleteSourcingHistory = (id) => API.delete(`sourcing-history/${id}/`);
export const deleteQuoteComparisonHistory = (id) => API.delete(`quote-comparison-history/${id}/`);

export default API;
