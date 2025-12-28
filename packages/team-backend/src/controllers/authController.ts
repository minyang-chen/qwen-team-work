import { Request, Response } from "express";

export const signup = async (req: Request, res: Response): Promise<void> => { 
  res.json({ success: true }); 
};

export const login = async (req: Request, res: Response): Promise<void> => { 
  res.json({ success: true }); 
};
