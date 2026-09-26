import axios from 'axios';

// The base URL of our backend
// Instead of typing this everywhere, we define it once
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Each function below is one API call
// They all return promises — we'll handle them with async/await

export const getTasks = () => API.get('/tasks');

export const createTask = (title) => API.post('/tasks', { title });

export const updateTask = (id, data) => API.patch(`/tasks/${id}`, data);

export const deleteTask = (id) => API.delete(`/tasks/${id}`);