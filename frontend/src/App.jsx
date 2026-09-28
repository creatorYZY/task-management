import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from './api';

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_COLORS = { low: '#888', medium: '#f0a500', high: '#e03e3e' };

function App() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  // Filter/sort/page state
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    sortBy: 'createdAt',
    order: 'desc',
    page: 1,
    limit: 5,
  });

  // Re-fetch whenever filters change
  useEffect(() => {
    loadTasks();
  }, [filters]);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      // Remove empty strings so they don't get sent as ?status=&priority=
      const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await getTasks(cleanParams);
      setTasks(response.data.data);           // our data array
      setPagination(response.data.pagination); // total, page, totalPages
    } catch (err) {
      setError(err.userMessage || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      await createTask(newTitle, newPriority);
      setNewTitle('');
      setNewPriority('medium');
      loadTasks(); // Refresh the list
    } catch (err) {
      setError(err.userMessage);
    }
  }

  async function handleToggle(task) {
    try {
      await updateTask(task.id, { completed: !task.completed });
      loadTasks();
    } catch (err) {
      setError(err.userMessage);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTask(id);
      loadTasks();
    } catch (err) {
      setError(err.userMessage);
    }
  }

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
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
      {loading && <div>Loading...</div>}

      {/* TASK LIST */}
      {!loading && (
        <>
          {tasks.length === 0 ? (
            <p>No tasks match your filters.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {tasks.map(task => (
                <li key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', marginBottom: '8px',
                  background: '#f5f5f5', borderRadius: '8px',
                  borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}`,
                }}>
                  <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task)} />
                  <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#999' : '#000' }}>
                    {task.title}
                  </span>
                  <span style={{ fontSize: '12px', color: PRIORITY_COLORS[task.priority], fontWeight: 'bold' }}>
                    {task.priority}
                  </span>
                  <button onClick={() => handleDelete(task.id)} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
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
        </>
      )}
    </div>
  );
}

export default App;
