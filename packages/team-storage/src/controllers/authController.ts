import { Request, Response } from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User, AuthSession } from '../models/UnifiedModels.js';

const JWT_SECRET = process.env.JWT_SECRET || 'team-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create NFS workspace path
    const nfsWorkspacePath = `/workspace/${username}`;

    // Create user
    const user = await User.create({
      username,
      email,
      passwordHash: hashedPassword,
      fullName: fullName || username,
      nfsWorkspacePath,
    });

    // Generate token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Create auth session with unique ID
    const { nanoid } = await import('nanoid');
    await AuthSession.create({
      sessionId: nanoid(),
      userId: user._id,
      workspacePath: nfsWorkspacePath,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Create auth session with unique ID
    const { nanoid } = await import('nanoid');
    await AuthSession.create({
      sessionId: nanoid(),
      userId: user._id,
      workspacePath: user.nfsWorkspacePath,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};
