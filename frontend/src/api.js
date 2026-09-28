import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Our API now wraps everything in { success, data }
// This interceptor unwraps it automatically so callers get data directly
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // When the server returns a 4xx/5xx, axios throws an error
    // We extract our error object from it so it's easy to display
    const message = error.response?.data?.error?.message || 'Something went wrong';
    error.userMessage = message;
    return Promise.reject(error);
  }
);

// Now accepts filter/sort/pagination options
export const getTasks = (params = {}) => API.get('/tasks', { params });

export const getTask = (id) => API.get(`/tasks/${id}`);

export const createTask = (title, priority = 'medium') =>
  API.post('/tasks', { title, priority });

export const updateTask = (id, data) => API.patch(`/tasks/${id}`, data);

export const deleteTask = (id) => API.delete(`/tasks/${id}`);
