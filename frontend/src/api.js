import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
})

// The backend now sends 10 tasks per page by default.
// Our screen shows the whole list, so we ask for up to 1000 at once.
// You can pass filters too, e.g. getTasks({ status: 'pending', search: 'react' })
export const getTasks = (params) => API.get('/tasks', { params: { limit: 1000, ...params } });

export const  createTask = (title) => API.post('/tasks', {title, completed: false});

export const updateTask = (id, data) => API.patch(`/tasks/${id}`, data);

export const deleteTask = (id) => API.delete(`/tasks/${id}`);

export const moveTask = (id, direction) => API.patch(`/tasks/${id}/move`, { direction });
