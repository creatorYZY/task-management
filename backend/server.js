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

// Temporary "database" — just an array in memory
// When the server restarts, this resets. That's okay for now.
let tasks = [
  { id: 1, title: 'Learn React', completed: false ,createdAt: new Date().toISOString()},
  { id: 2, title: 'Learn Node.js', completed: false , createdAt:new Date().toISOString() },
  { id: 3, title: 'Learn Mongo', completed: false , createdAt:new Date().toISOString() },
];

// A counter to give each new task a unique ID
let nextId = 3;
console.log("orginal value", nextId)
// ─────────────────────────────────────────────
// ROUTES — these are the "doors" into your backend
// Each route listens for a specific HTTP method + URL
// ─────────────────────────────────────────────

// GET /api/tasks — return all tasks
// When React asks "give me all tasks", this runs
app.get('/api/tasks', (req, res) => {
  if (req.query.completed === undefined) {
    return res.json(tasks); // No filter requested — send everything
  }

  const isCompleted = req.query.completed === 'true'; // req.query values are always strings
  res.json(tasks.filter(t => t.completed === isCompleted));
});

app.get('/api/tasks/:id', (req, res)=>{
    const id = parseInt(req.params.id);
    res.json(tasks.find(t=> t.id ===id))
})
// POST /api/tasks — create a new task
// When React says "create this task", this runs
app.post('/api/tasks', (req, res) => {
  const { title } = req.body; // Extract 'title' from the request body

  const newTask = {
    id: nextId++,
    title: title,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask); // Add to our "database"
  res.status(201).json(newTask); // 201 = "Created successfully"
  console.log(nextId);
  console.log(newTask.createdAt);
});

// PATCH /api/tasks/:id — update a task (toggle completed)
// The :id part is a "path parameter" — it captures whatever is in the URL
// e.g. PATCH /api/tasks/3 → req.params.id = "3"
app.patch('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id); // Convert string "3" to number 3
  const task = tasks.find(t => t.id === id); // Find the task

  if (!task) {
    return res.status(404).json({ error: 'Task not found' }); // 404 = Not Found
  }

  // Update only the fields that were sent in the request body
  if (req.body.title !== undefined) task.title = req.body.title;
  if (req.body.completed !== undefined) task.completed = req.body.completed;

  res.json(task); // Send back the updated task
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
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(index, 1); // Remove 1 item at this index
  console.log(nextId);

  res.status(204).send(); // 204 = "Success, nothing to send back"

});

// Start the server — listen for requests on port 5000
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});