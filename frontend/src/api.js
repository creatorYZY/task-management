import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
})

export const getTasks = () => API.get('/tasks');

export const  createTask = (title) => API.post('/tasks', {title, completed: false});

export const updateTask = (id, data) => API.patch(`/tasks/${id}`, data);

export const deleteTask = (id) => API.delete(`/tasks/${id}`);

export const moveTask = (id, direction) => API.patch(`/tasks/${id}/move`, { direction });
