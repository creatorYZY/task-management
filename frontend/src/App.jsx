import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask, moveTask } from './api';

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
  const [actionError, setActionError] = useState(null); // Small message shown when an update fails and is rolled back

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
      // Backend replies { success, data, pagination }
      // axios puts that whole reply in response.data, so our tasks are in response.data.data
      setTasks(response.data.data);
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return; // Don't create empty tasks

    setActionError(null);
    const oldTasks = tasks;   // Backup, in case we need to roll back
    const typedTitle = newTitle;

    // The server picks the real id, so for now we use a temporary one
    const tempId = Date.now();
    const tempTask = {
      id: tempId,
      title: typedTitle,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Update the screen RIGHT AWAY
    setTasks([...tasks, tempTask]);
    setNewTitle('');

    try {
      // 2. Call the server in the background
      const response = await createTask(typedTitle);
      // 3. Success: swap the temporary task for the real one from the server
      setTasks(current => current.map(t => t.id === tempId ? response.data.data : t));
    } catch (err) {
      // 4. Failure: rollback — put everything back like it was
      setTasks(oldTasks);
      setNewTitle(typedTitle); // Give the typed text back to the user
      // Show the server's message if it sent one (e.g. "Title must be 100 characters or less")
      // err.response is undefined when the server is off, so we use ?. and a fallback
      // The backend's error now looks like { error: { code, message } }
      setActionError(err.response?.data?.error?.message || 'Failed to create task');
    }
  }
  async function handleUpdate(id, updatedData) {
    try {
      const response = await updateTask(id, updatedData);
      setTasks(tasks.map(t => t.id === id ? response.data.data : t));
    } catch (err){
      setError('Failed to update task');
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
      setActionError('Failed to update task');
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
      setActionError(err.response?.data?.error?.message || 'Failed to edit task');
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
      setActionError('Failed to move task');
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
      setActionError('Failed to delete task');
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

  // Tasks that are NOT completed yet
  // No useState needed — it's worked out from `tasks` every time we render
  const remainingCount = tasks.filter(t => !t.completed).length;

  // RENDER — what the user actually sees
  if (loading) {
    return (
      <div className="spinner-wrapper">
        <div className="spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>TaskFlow</h1>

      {/* REMAINING BADGE */}
      <span style={{
        display: 'inline-block',
        marginBottom: '16px',
        padding: '4px 12px',
        borderRadius: '999px',
        background: remainingCount === 0 ? '#2e9e4f' : '#3b82f6',
        color: 'white',
        fontSize: '14px',
      }}>
        {remainingCount === 0
          ? 'All done!'
          : `${remainingCount} ${remainingCount === 1 ? 'task' : 'tasks'} remaining`}
      </span>

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

      {/* Small message when an update failed and was rolled back */}
      {actionError && (
        <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px' }}>
          {actionError} — your change was undone.
        </p>
      )}

      {/* TASK LIST */}
      {tasks.length === 0 ? (
        <p>No tasks yet. Add one above!!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task, index) => (
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
              {/* Move up / down buttons — disabled at the top and bottom of the list */}
              <button
                onClick={() => handleMove(index, 'up')}
                disabled={index === 0}
                title="Move up"
              >
                ▲
              </button>
              <button
                onClick={() => handleMove(index, 'down')}
                disabled={index === tasks.length - 1}
                title="Move down"
              >
                ▼
              </button>
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