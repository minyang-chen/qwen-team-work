import { Request, Response } from 'express';
import { Todo } from '../models/UnifiedModels.js';

export const getTodos = async (req: Request, res: Response): Promise<void> => {
  try {
    const todos = await Todo.find({ userId: req.user?.id }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get todos' });
  }
};

export const createTodo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }
    const todo = await Todo.create({ userId: req.user?.id, text });
    res.status(201).json(todo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
};

export const updateTodo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;
    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId: req.user?.id },
      { text, completed, updatedAt: new Date() },
      { new: true }
    );
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(todo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
};

export const deleteTodo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const todo = await Todo.findOneAndDelete({ _id: id, userId: req.user?.id });
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
};
