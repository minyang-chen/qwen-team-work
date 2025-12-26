import { Request, Response } from "express";

export const projectController = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
