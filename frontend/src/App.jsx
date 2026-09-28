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
  const [editingId, setEditingId] = useState(null); // id of the task being edited (null = none)
  const [editText, setEditText] = useState('');     // What's typed in the edit box

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
  async function handleUpdate(id, updatedData) {
    try {
      const response = await updateTask(id, updatedData);
      setTasks(tasks.map(t => t.id === id ? response.data : t));
    } catch (err){
      setError('Failed to update task');
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

    try {
      const response = await updateTask(task.id, { title: newText });
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
      setEditingId(null); // Back to show mode
    } catch (err) {
      setError('Failed to edit task');
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

  async function handleClearCompleted() {
    const completedTasks = tasks.filter(t => t.completed);

    try {
      await Promise.all(completedTasks.map(t => deleteTask(t.id)));
      setTasks(tasks.filter(t => !t.completed)); // Keep only the not-completed ones
    } catch (err) {
      setError('Failed to clear completed tasks');
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
              {/* -Toggle completed */}
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
                    style={{ padding: '4px', fontSize: '16px' }}
                  />
                ) : (
                  // SHOW MODE — click the title to edit it
                  <span
                    onClick={() => handleStartEdit(task)}
                    style={{ cursor: 'pointer' }}
                    title="Click to edit"
                  >
                    {task.title}
                  </span>
                )}
                <span style={{paddingLeft:'15px'}}>
                {new Date(task.createdAt).toLocaleString()}

                </span>
              </span>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(task.id)}
                style={{ background: '#ff4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
        Delete     {task.title}   
              </button>
            </li>
          ))}
        </ul>
      )}

      <p style={{ color: '#666', fontSize: '14px' }}>
        {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
      </p>
      <button
      onClick={handleClearCompleted}
      >
        Delete completed
      </button>
    </div>
  );
}

export default App;