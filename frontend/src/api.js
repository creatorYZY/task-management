import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Our API now wraps everything in { success, data } or { success, error: { code, message } }.
// This interceptor pulls the human-readable message onto the error, so every catch block
// can just do: err.userMessage || 'fallback text'
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || 'Something went wrong';
    error.userMessage = message;
    return Promise.reject(error);
  }
);

// Accepts filter/sort/pagination options, e.g. getTasks({ status: 'pending', search: 'react' })
export const getTasks = (params = {}) => API.get('/tasks', { params });

export const getTask = (id) => API.get(`/tasks/${id}`);

export const createTask = (title, priority = 'medium') =>
  API.post('/tasks', { title, priority });

export const updateTask = (id, data) => API.patch(`/tasks/${id}`, data);

export const deleteTask = (id) => API.delete(`/tasks/${id}`);

export const moveTask = (id, direction) => API.patch(`/tasks/${id}/move`, { direction });
