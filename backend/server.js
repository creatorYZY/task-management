const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ─────────────────────────────────────────────
// RESPONSE HELPERS — every response now has the SAME shape
// Success:  { success: true, data: ... }
// Failure:  { success: false, error: { code, message } }
// This means React never has to guess "did this work or not?" — it just checks .success
// ─────────────────────────────────────────────

function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function errorResponse(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: code,       // Machine-readable: "NOT_FOUND", "VALIDATION_ERROR"
      message: message, // Human-readable: "Task with id 42 not found"
    },
  });
}

// ─────────────────────────────────────────────
// "DATABASE"
// ─────────────────────────────────────────────
let tasks = [
  { id: 1, title: 'Learn React', completed: false, priority: 'medium', createdAt: new Date().toISOString() },
  { id: 2, title: 'Learn Node.js', completed: true, priority: 'high', createdAt: new Date().toISOString() },
  { id: 3, title: 'Learn PostgreSQL', completed: false, priority: 'high', createdAt: new Date().toISOString() },
  { id: 4, title: 'Build TaskFlow', completed: false, priority: 'low', createdAt: new Date().toISOString() },
];
let nextId = 5;

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// GET /api/tasks
// Supports: ?status=completed|pending  ?priority=high|medium|low  ?search=text
// Supports: ?sortBy=createdAt|title|priority  ?order=asc|desc  (sortBy omitted = natural/manual order)
// Supports: ?page=1  ?limit=10
app.get('/api/tasks', (req, res) => {
  // req.query contains all query parameters as an object
  // e.g. /api/tasks?status=completed&page=2
  // → req.query = { status: 'completed', page: '2' }
  // Note: all values are STRINGS — you must convert numbers yourself
  const { status, priority, search, sortBy, order, page, limit } = req.query;

  let result = [...tasks]; // Work on a copy so we don't mutate the original

  // ── FILTERING ──
  if (status === 'completed') {
    result = result.filter(t => t.completed === true);
  } else if (status === 'pending') {
    result = result.filter(t => t.completed === false);
  }

  if (priority) {
    result = result.filter(t => t.priority === priority);
  }

  // Case-insensitive search across task titles
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(searchLower));
  }

  // ── SORTING ── (no sortBy = keep the tasks in their stored/manual order)
  if (sortBy) {
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // For strings, compare alphabetically
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return order === 'desc' ? 1 : -1;
      if (valA > valB) return order === 'desc' ? -1 : 1;
      return 0;
    });
  }

  // ── PAGINATION ──
  // Total count BEFORE pagination (the client needs this to know how many pages exist)
  const total = result.length;

  const pageNum = parseInt(page) || 1;   // Default: page 1
  const limitNum = parseInt(limit) || 10; // Default: 10 per page
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;

  result = result.slice(startIndex, endIndex);

  // Return data AND pagination metadata
  return res.json({
    success: true,
    data: result,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/tasks/:id — get a single task
app.get('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);

  // Validate: is the id actually a number?
  if (isNaN(id)) {
    return errorResponse(res, 400, 'INVALID_ID', 'Task id must be a number');
  }

  const task = tasks.find(t => t.id === id);

  if (!task) {
    return errorResponse(res, 404, 'NOT_FOUND', `Task with id ${id} does not exist`);
  }

  return successResponse(res, task);
});

// POST /api/tasks — create a task
app.post('/api/tasks', (req, res) => {
  const { title, priority } = req.body;

  // ── VALIDATION ──
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title is required and must be a non-empty string');
  }

  if (title.trim().length > 100) {
    return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title must be 100 characters or fewer');
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    return errorResponse(res, 400, 'VALIDATION_ERROR', `Priority must be one of: ${validPriorities.join(', ')}`);
  }

  const newTask = {
    id: nextId++,
    title: title.trim(),
    completed: false,
    priority: priority || 'medium', // Default priority
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  return successResponse(res, newTask, 201); // 201 = Created
});

// PATCH /api/tasks/:id — update parts of a task
app.patch('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return errorResponse(res, 400, 'INVALID_ID', 'Task id must be a number');
  }

  const task = tasks.find(t => t.id === id);

  if (!task) {
    return errorResponse(res, 404, 'NOT_FOUND', `Task with id ${id} does not exist`);
  }

  const { title, completed, priority } = req.body;

  // Validate each field only if it was sent
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title must be a non-empty string');
    }
    if (title.trim().length > 100) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title must be 100 characters or fewer');
    }
    task.title = title.trim();
  }

  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'completed must be true or false');
    }
    task.completed = completed;
  }

  if (priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', `Priority must be one of: ${validPriorities.join(', ')}`);
    }
    task.priority = priority;
  }

  return successResponse(res, task);
});

// PATCH /api/tasks/:id/move — move a task up or down in the list
// Body: { direction: 'up' } or { direction: 'down' }
// The order of the array IS the order of the tasks, so moving = swapping two items.
// This only matches what the user sees on screen when the list isn't sorted/filtered —
// see the `canReorder` check on the frontend.
app.patch('/api/tasks/:id/move', (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return errorResponse(res, 400, 'INVALID_ID', 'Task id must be a number');
  }

  const { direction } = req.body;
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return errorResponse(res, 404, 'NOT_FOUND', `Task with id ${id} does not exist`);
  }

  if (direction !== 'up' && direction !== 'down') {
    return errorResponse(res, 400, 'VALIDATION_ERROR', "direction must be 'up' or 'down'");
  }

  // Where is the task we want to swap with?
  const otherIndex = direction === 'up' ? index - 1 : index + 1;

  // Already first (can't go up) or last (can't go down)?
  if (otherIndex < 0 || otherIndex >= tasks.length) {
    return errorResponse(res, 400, 'VALIDATION_ERROR', `Task is already at the ${direction === 'up' ? 'top' : 'bottom'}`);
  }

  // Swap the two tasks
  [tasks[index], tasks[otherIndex]] = [tasks[otherIndex], tasks[index]];

  return successResponse(res, tasks); // Send back the whole updated list
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return errorResponse(res, 400, 'INVALID_ID', 'Task id must be a number');
  }

  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return errorResponse(res, 404, 'NOT_FOUND', `Task with id ${id} does not exist`);
  }

  tasks.splice(index, 1);
  return res.status(204).send(); // 204 = No Content (nothing to return after delete)
});

// ─────────────────────────────────────────────
// CATCH-ALL — runs only if no route above matched.
// This must stay AFTER all the routes above.
// ─────────────────────────────────────────────
app.use((req, res) => {
  return errorResponse(res, 404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} does not exist`);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
