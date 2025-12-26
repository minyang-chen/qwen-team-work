import { Request, Response } from "express";

export const getProfile = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const updateProfile = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const regenerateApiKey = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
