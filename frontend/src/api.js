import axios from 'axios';

const API = axios.create({
  baseURL: window.location.hostname === 'localhost' && window.location.port === '5173' 
    ? 'http://localhost:8000/api/' 
    : '/api/',
});

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

export default API;
