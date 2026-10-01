import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask, moveTask } from './api';

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_COLORS = { low: '#888', medium: '#f0a500', high: '#e03e3e' };

function App() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);             // Fatal error (e.g. the list failed to load)
  const [actionError, setActionError] = useState(null);  // Small banner for a failed + rolled-back action

  // Create-task form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  // In-place editing state
  const [editingId, setEditingId] = useState(null); // id of the task being edited (null = none)
  const [editText, setEditText] = useState('');     // What's typed in the edit box

  // Filter/sort/page state
  // sortBy: '' means "manual order" — the plain order tasks are stored in, which is what
  // the up/down arrows move around. Any other sortBy re-orders the list on the server.
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    sortBy: '',
    order: 'desc',
    page: 1,
    limit: 5,
  });

  // Defined with `const` (not `function`) and ABOVE the useEffect that calls it,
  // so eslint can see it's declared before use.
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      // Remove empty strings so they don't get sent as ?status=&priority=
      const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const response = await getTasks(cleanParams);
      setTasks(response.data.data);             // our task array
      setPagination(response.data.pagination);  // total, page, totalPages
    } catch (err) {
      setError(err.userMessage || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever filters change
  useEffect(() => {
    loadTasks();
  }, [filters]);

  async function handleCreate() {
    if (!newTitle.trim()) return; // Don't create empty tasks

    setActionError(null);
    const oldTasks = tasks;       // Backup, in case we need to roll back
    const typedTitle = newTitle;
    const typedPriority = newPriority;

    // The server picks the real id, so for now we use a temporary one
    const tempId = Date.now();
    const tempTask = {
      id: tempId,
      title: typedTitle,
      completed: false,
      priority: typedPriority,
      createdAt: new Date().toISOString(),
    };

    // 1. Update the screen RIGHT AWAY
    // (Note: if a filter is active and this task wouldn't actually match it, it will
    // still show up here until the next reload — a known limitation of doing this optimistically.)
    setTasks([...tasks, tempTask]);
    setNewTitle('');
    setNewPriority('medium');

    try {
      // 2. Call the server in the background
      const response = await createTask(typedTitle, typedPriority);
      // 3. Success: swap the temporary task for the real one from the server
      setTasks(current => current.map(t => t.id === tempId ? response.data.data : t));
    } catch (err) {
      // 4. Failure: rollback — put everything back like it was
      setTasks(oldTasks);
      setNewTitle(typedTitle);
      setNewPriority(typedPriority);
      setActionError(err.userMessage || 'Failed to create task');
    }
  }

  async function handleToggle(task) {
    setActionError(null);
    const oldTasks = tasks; // Backup, in case we need to roll back

    // 1. Flip the checkbox on screen RIGHT AWAY
    setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));

    try {
      // 2. Tell the server in the background
      await updateTask(task.id, { completed: !task.completed });
    } catch (err) {
      // 3. Failed: rollback to the backup
      setTasks(oldTasks);
      setActionError(err.userMessage || 'Failed to update task');
    }
  }

  // Click on a title: switch that task to edit mode
  function handleStartEdit(task) {
    setEditingId(task.id);
    setEditText(task.title); // Put the old title in the box
  }

  // Enter pressed: save the new title
  async function handleSaveEdit(task) {
    const newText = editText.trim();

    // Empty or unchanged? Just leave edit mode without saving
    if (!newText || newText === task.title) {
      setEditingId(null);
      return;
    }

    setActionError(null);
    const oldTasks = tasks; // Backup, in case we need to roll back

    // 1. Show the new title and leave edit mode RIGHT AWAY
    setTasks(tasks.map(t => t.id === task.id ? { ...t, title: newText } : t));
    setEditingId(null);

    try {
      // 2. Save on the server in the background
      await updateTask(task.id, { title: newText });
    } catch (err) {
      // 3. Failed: rollback — the old title comes back
      setTasks(oldTasks);
      setActionError(err.userMessage || 'Failed to edit task');
    }
  }

  async function handleDelete(id) {
    setActionError(null);
    const oldTasks = tasks; // Backup, in case we need to roll back

    // 1. Remove the task from the screen RIGHT AWAY
    setTasks(tasks.filter(t => t.id !== id));

    try {
      // 2. Delete on the server in the background
      await deleteTask(id);
    } catch (err) {
      // 3. Failed: rollback — the task comes back
      setTasks(oldTasks);
      setActionError(err.userMessage || 'Failed to delete task');
    }
  }

  // Move a task up or down (swap it with its neighbour)
  async function handleMove(index, direction) {
    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    if (otherIndex < 0 || otherIndex >= tasks.length) return; // Already at the edge

    setActionError(null);
    const oldTasks = tasks; // Backup, in case we need to roll back
    const taskId = tasks[index].id;

    // 1. Swap on screen RIGHT AWAY — swap inside a COPY, never inside `tasks` itself
    const newTasks = [...tasks];
    [newTasks[index], newTasks[otherIndex]] = [newTasks[otherIndex], newTasks[index]];
    setTasks(newTasks);

    try {
      // 2. Tell the server in the background
      await moveTask(taskId, direction);
    } catch (err) {
      // 3. Failed: rollback
      setTasks(oldTasks);
      setActionError(err.userMessage || 'Failed to move task');
    }
  }

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
  }

  // Reordering only makes sense on the plain, unsorted, unfiltered list — otherwise
  // "up" on screen wouldn't match "up" in the server's real, stored order.
  const canReorder = !filters.status && !filters.priority && !filters.search && !filters.sortBy;

  if (loading) {
    return (
      <div className="spinner-wrapper">
        <div className="spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <h1>TaskFlow</h1>

      {/* CREATE */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="New task..."
          style={{ flex: 1, padding: '8px', fontSize: '16px' }}
        />
        <select
          value={newPriority}
          onChange={e => setNewPriority(e.target.value)}
          style={{ padding: '8px' }}
        >
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={handleCreate} style={{ padding: '8px 16px' }}>Add</button>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          placeholder="Search..."
          value={filters.search}
          onChange={e => updateFilter('search', e.target.value)}
          style={{ padding: '6px', flex: 1, minWidth: '120px' }}
        />
        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} style={{ padding: '6px' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <select value={filters.priority} onChange={e => updateFilter('priority', e.target.value)} style={{ padding: '6px' }}>
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.sortBy} onChange={e => updateFilter('sortBy', e.target.value)} style={{ padding: '6px' }}>
          <option value="">Sort: Manual</option>
          <option value="createdAt">Sort: Date</option>
          <option value="title">Sort: Title</option>
          <option value="priority">Sort: Priority</option>
        </select>
        <select value={filters.order} onChange={e => updateFilter('order', e.target.value)} style={{ padding: '6px' }}>
          <option value="desc">↓ Desc</option>
          <option value="asc">↑ Asc</option>
        </select>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      {actionError && (
        <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px' }}>
          {actionError} — your change was undone.
        </p>
      )}

      {/* TASK LIST */}
      {tasks.length === 0 ? (
        <p>No tasks match your filters.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task, index) => (
            <li key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', marginBottom: '8px',
              background: '#f5f5f5', borderRadius: '8px',
              borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}`,
            }}>
              {/* Toggle completed */}
              <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task)} />

              {/* Task title — click to edit in place */}
              {editingId === task.id ? (
                // EDIT MODE — show an input box
                <input
                  type="text"
                  value={editText}
                  autoFocus
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(task);
                    if (e.key === 'Escape') setEditingId(null); // Cancel
                  }}
                  onBlur={() => setEditingId(null)} // Clicked elsewhere = cancel
                  style={{ flex: 1, padding: '4px', fontSize: '16px' }}
                />
              ) : (
                // SHOW MODE — click the title to edit it
                <span
                  onClick={() => handleStartEdit(task)}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    color: task.completed ? '#999' : '#000',
                  }}
                  title="Click to edit"
                >
                  {task.title}
                </span>
              )}

              <span style={{ fontSize: '12px', color: PRIORITY_COLORS[task.priority], fontWeight: 'bold' }}>
                {task.priority}
              </span>

              {/* Move up / down — only meaningful in manual order, with no filter/search active */}
              <button
                onClick={() => handleMove(index, 'up')}
                disabled={index === 0 || !canReorder}
                title={canReorder ? 'Move up' : 'Clear search/filter/sort to reorder'}
              >
                ▲
              </button>
              <button
                onClick={() => handleMove(index, 'down')}
                disabled={index === tasks.length - 1 || !canReorder}
                title={canReorder ? 'Move down' : 'Clear search/filter/sort to reorder'}
              >
                ▼
              </button>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(task.id)}
                style={{ background: '#ff4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* PAGINATION */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
          <button
            disabled={pagination.page === 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
          >← Prev</button>
          <span style={{ padding: '8px' }}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
          >Next →</button>
        </div>
      )}
    </div>
  );
}

export default App;
