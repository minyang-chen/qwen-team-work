import { Request, Response } from 'express';
import { User } from '../models/UnifiedModels.js';
import crypto from 'crypto';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { full_name, email, updated_at: new Date() },
      { new: true }
    ).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { api_key: apiKey, updated_at: new Date() },
      { new: true }
    ).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ api_key: apiKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
};
