// We're importing the Express library
// Think of 'require' like Python's 'import'
const express = require('express');
const cors = require('cors');

// Create an Express application
// This is your web server
const app = express();

// MIDDLEWARE — functions that run on EVERY request before it hits your routes
// express.json() tells Express: "if a request has JSON in the body, parse it automatically"
// Without this, req.body would be undefined
app.use(express.json());

// Allow requests from our React frontend (which runs on a different port)
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
    error: { code, message },
  });
}

// Temporary "database" — just an array in memory
// When the server restarts, this resets. That's okay for now.
let tasks = [
  { id: 1, title: 'Learn React', completed: false, priority: 'medium', createdAt: new Date().toISOString() },
  { id: 2, title: 'Learn Node.js', completed: false, priority: 'high', createdAt: new Date().toISOString() },
  { id: 3, title: 'Learn Mongo', completed: false, priority: 'low', createdAt: new Date().toISOString() },
];

// A counter to give each new task a unique ID
let nextId = 3;
console.log("orginal value", nextId)
// ─────────────────────────────────────────────
// ROUTES — these are the "doors" into your backend
// Each route listens for a specific HTTP method + URL
// ─────────────────────────────────────────────

// VALIDATION — one place that checks a title, used by both POST and PATCH
const MAX_TITLE_LENGTH = 100;

// Returns an error message (text) if the title is bad, or null if it is fine
function validateTitle(title) {
  if (typeof title !== 'string') {
    return 'Title is required'; // missing, or not text (like a number)
  }
  const trimmed = title.trim(); // remove spaces at the start and end
  if (trimmed.length === 0) {
    return 'Title cannot be empty';
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or less`;
  }
  return null; // null = no problem
}

// GET /api/tasks — return tasks, with optional filtering, searching, sorting, and pagination
// Examples:
//   /api/tasks?completed=true
//   /api/tasks?search=react
//   /api/tasks?sortBy=title&order=asc
//   /api/tasks?page=2&limit=10
app.get('/api/tasks', (req, res) => {
  const { completed, search, sortBy, order, page, limit } = req.query;

  let result = [...tasks]; // work on a COPY, so we never accidentally change the real list

  // ── FILTER by completed ──
  if (completed !== undefined) {
    const isCompleted = completed === 'true'; // req.query values are always strings
    result = result.filter(t => t.completed === isCompleted);
  }

  // ── SEARCH by title (case-insensitive) ──
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(searchLower));
  }

  // ── SORT ──
  if (sortBy) {
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return order === 'desc' ? 1 : -1;
      if (valA > valB) return order === 'desc' ? -1 : 1;
      return 0;
    });
  }

  // ── PAGINATE ──
  const total = result.length; // count BEFORE slicing, so React knows how many pages exist
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const startIndex = (pageNum - 1) * limitNum;
  result = result.slice(startIndex, startIndex + limitNum);

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

  if (isNaN(id)) {
    return errorResponse(res, 400, 'INVALID_ID', 'Task id must be a number');
  }

  const task = tasks.find(t => t.id === id);

  if (!task) {
    return errorResponse(res, 404, 'NOT_FOUND', `Task with id ${id} does not exist`);
  }

  return successResponse(res, task);
});
// POST /api/tasks — create a new task
// When React says "create this task", this runs
app.post('/api/tasks', (req, res) => {
  const { title, priority } = req.body; // Extract fields from the request body

  // Check the title BEFORE creating anything
  const titleError = validateTitle(title);
  if (titleError) {
    return errorResponse(res, 400, 'VALIDATION_ERROR', titleError);
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    return errorResponse(res, 400, 'VALIDATION_ERROR', `Priority must be one of: ${validPriorities.join(', ')}`);
  }

  const newTask = {
    id: nextId++,
    title: title.trim(), // save without the extra spaces
    completed: false,
    priority: priority || 'medium', // default priority if none was sent
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask); // Add to our "database"
  return successResponse(res, newTask, 201); // 201 = "Created successfully"
});

// PATCH /api/tasks/:id — update a task (toggle completed)
// The :id part is a "path parameter" — it captures whatever is in the URL
// e.g. PATCH /api/tasks/3 → req.params.id = "3"
app.patch('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id); // Convert string "3" to number 3

  if (isNaN(id)) {
    return errorResponse(res, 400, 'INVALID_ID', 'Task id must be a number');
  }

  const task = tasks.find(t => t.id === id); // Find the task

  if (!task) {
    return errorResponse(res, 404, 'NOT_FOUND', `Task with id ${id} does not exist`);
  }

  // If a title was sent, check it BEFORE changing anything
  if (req.body.title !== undefined) {
    const titleError = validateTitle(req.body.title);
    if (titleError) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', titleError);
    }
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (req.body.priority !== undefined && !validPriorities.includes(req.body.priority)) {
    return errorResponse(res, 400, 'VALIDATION_ERROR', `Priority must be one of: ${validPriorities.join(', ')}`);
  }

  // Update only the fields that were sent in the request body
  if (req.body.title !== undefined) task.title = req.body.title.trim();
  if (req.body.completed !== undefined) task.completed = req.body.completed;
  if (req.body.priority !== undefined) task.priority = req.body.priority;

  return successResponse(res, task);
});

// PATCH /api/tasks/:id/move — move a task up or down in the list
// Body: { direction: 'up' } or { direction: 'down' }
// The order of the array IS the order of the tasks, so moving = swapping two items
app.patch('/api/tasks/:id/move', (req, res) => {
  const id = parseInt(req.params.id);
  const { direction } = req.body;
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: "direction must be 'up' or 'down'" }); // 400 = Bad Request
  }

  // Where is the task we want to swap with?
  const otherIndex = direction === 'up' ? index - 1 : index + 1;

  // Already first (can't go up) or last (can't go down)?
  if (otherIndex < 0 || otherIndex >= tasks.length) {
    return res.status(400).json({ error: `Task is already at the ${direction === 'up' ? 'top' : 'bottom'}` });
  }

  // Swap the two tasks
  [tasks[index], tasks[otherIndex]] = [tasks[otherIndex], tasks[index]];

  res.json(tasks); // Send back the whole updated list
});

// DELETE /api/tasks/:id — delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return errorResponse(res, 400, 'INVALID_ID', 'Task id must be a number');
  }

  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return errorResponse(res, 404, 'NOT_FOUND', `Task with id ${id} does not exist`);
  }

  tasks.splice(index, 1); // Remove 1 item at this index

  return res.status(204).send(); // 204 = "Success, nothing to send back"
});

// ─────────────────────────────────────────────
// CATCH-ALL — runs only if no route above matched
// ─────────────────────────────────────────────
app.use((req, res) => {
  return errorResponse(res, 404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} does not exist`);
});

// Start the server — listen for requests on port 5000
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});