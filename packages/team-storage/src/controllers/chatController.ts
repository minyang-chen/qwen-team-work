import { Request, Response } from "express";

export const sendMessage = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const getChatHistory = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
