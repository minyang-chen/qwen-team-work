import { useState } from 'react';
import { API_BASE } from '../../../config/api';
export function useTodos() {
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');
    const loadTodos = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/todos`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setTodos(data);
            }
        }
        catch (err) {
        }
    };
    const addTodo = async (e) => {
        e.preventDefault();
        if (!newTodo.trim())
            return;
        try {
            const res = await fetch(`${API_BASE}/api/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('team_session_token')}`
                },
                body: JSON.stringify({ text: newTodo })
            });
            await res.json();
            setNewTodo('');
            loadTodos();
        }
        catch (err) {
        }
    };
    const toggleTodo = async (id) => {
        try {
            const todo = todos.find(t => t._id === id);
            if (!todo)
                return;
            await fetch(`${API_BASE}/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('team_session_token')}`
                },
                body: JSON.stringify({ completed: !todo.completed })
            });
            loadTodos();
        }
        catch (err) {
        }
    };
    const deleteTodo = async (id) => {
        try {
            await fetch(`${API_BASE}/api/todos/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('team_session_token')}` }
            });
            loadTodos();
        }
        catch (err) {
        }
    };
    const updateTodo = async (id, text) => {
        try {
            await fetch(`${API_BASE}/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('team_session_token')}`
                },
                body: JSON.stringify({ text })
            });
            loadTodos();
        }
        catch (err) {
        }
    };
    const startEditing = (id) => {
        setTodos(todos.map(t => t._id === id ? { ...t, editing: true } : t));
    };
    const cancelEditing = (id) => {
        setTodos(todos.map(t => t._id === id ? { ...t, editing: false } : t));
    };
    return {
        todos,
        setTodos,
        newTodo,
        setNewTodo,
        loadTodos,
        addTodo,
        toggleTodo,
        deleteTodo,
        updateTodo,
        startEditing,
        cancelEditing
    };
}
