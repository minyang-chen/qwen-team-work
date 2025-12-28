import { Request, Response } from "express";

export const sendBroadcast = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const getNotifications = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
export const replyToNotification = async (req: Request, res: Response): Promise<void> => { res.json({ success: true }); };
