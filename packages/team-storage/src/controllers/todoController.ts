import { Request, Response } from "express";

export const getTodos = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const createTodo = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const updateTodo = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const deleteTodo = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
