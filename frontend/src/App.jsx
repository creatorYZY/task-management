import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from './api';

function App() {
  // STATE — React's memory
  // When state changes, React re-renders the component automatically
  // useState(initialValue) returns [currentValue, functionToUpdateIt]
  const [tasks, setTasks] = useState([]);        // Our list of tasks
  const [newTitle, setNewTitle] = useState('');  // What's typed in the input
  const [loading, setLoading] = useState(true);  // Are we fetching?
  const [error, setError] = useState(null);      // Did something go wrong?

  // useEffect — runs code after the component renders
  // The empty [] means "run this only once, when the component first loads"
  // This is where we fetch initial data
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const response = await getTasks();
      setTasks(response.data); // response.data contains the JSON from our backend
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return; // Don't create empty tasks

    try {
      const response = await createTask(newTitle);
      setTasks([...tasks, response.data]); // Add new task to the list
      setNewTitle(''); // Clear the input
    } catch (err) {
      setError('Failed to create task');
    }
  }

  async function handleToggle(task) {
    try {
      const response = await updateTask(task.id, { completed: !task.completed });
      // Replace the old task with the updated one
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
    } catch (err) {
      setError('Failed to update task');
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id)); // Remove from list
    } catch (err) {
      setError('Failed to delete task');
    }
  }

  // RENDER — what the user actually sees
  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>TaskFlow</h1>

      {/* CREATE TASK */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="What needs to be done?"
          style={{ flex: 1, padding: '8px', fontSize: '16px' }}
        />
        <button onClick={handleCreate} style={{ padding: '8px 16px' }}>
          Add Task
        </button>
      </div>

      {/* TASK LIST */}
      {tasks.length === 0 ? (
        <p>No tasks yet. Add one above!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map(task => (
            <li
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                marginBottom: '8px',
                background: '#f5f5f5',
                borderRadius: '8px',
              }}
            >
              {/* Toggle completed */}
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task)}
              />
              {/* Task title — strikethrough if completed */}
              <span style={{
                flex: 1,
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? '#999' : '#000',
              }}>
                {task.title}
                <span style={{paddingLeft:'15px'}}>
                {task.createdAt}

                </span>
              </span>
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

      <p style={{ color: '#666', fontSize: '14px' }}>
        {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
      </p>
    </div>
  );
}

export default App;