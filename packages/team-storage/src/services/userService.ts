// @ts-nocheck
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/UnifiedModels.js';
import { BCRYPT_ROUNDS } from '../config/env.js';
import { CreateUserData, UserUpdateData, UserDocument } from '@qwen-team/shared';
import { backendLogger } from '@qwen-team/shared';

const logger = backendLogger.child({ service: 'userService' });

export const userService = {
  async createUser(userData: CreateUserData): Promise<UserDocument> {
    const { username, email, full_name, phone, password } = userData;
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    const user = new User({
      username,
      email,
      fullName: full_name,
      phone,
      passwordHash: hashedPassword,
      nfsWorkspacePath: `/workspaces/${username}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await user.save();
    logger.info('User created successfully', { userId: user._id, username });
    return user.toObject() as UserDocument;
  },

  async findByUsernameOrEmail(username: string, email: string): Promise<UserDocument | null> {
    const user = await User.findOne({
      $or: [{ username }, { email }]
    });
    return user ? user.toObject() as UserDocument : null;
  },

  async findByUsername(username: string): Promise<UserDocument | null> {
    const user = await User.findOne({ username });
    return user ? user.toObject() as UserDocument : null;
  },

  async findById(userId: string): Promise<UserDocument | null> {
    const user = await User.findById(userId);
    return user ? user.toObject() as UserDocument : null;
  },

  async getUserByEmail(email: string): Promise<UserDocument | null> {
    const user = await User.findOne({ email });
    return user ? user.toObject() as UserDocument : null;
  },

  async getUserById(userId: string): Promise<UserDocument | null> {
    const user = await User.findById(userId);
    return user ? user.toObject() as UserDocument : null;
  },

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.passwordHash);
  },

  async updateUser(userId: string, updates: UserUpdateData): Promise<UserDocument | null> {
    const user = await User.findByIdAndUpdate(
      userId, 
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (user) {
      logger.info('User updated successfully', { userId, updates: Object.keys(updates) });
    }
    return user ? user.toObject() as UserDocument : null;
  },

  async updateProfile(userId: string, profileData: UserUpdateData): Promise<UserDocument | null> {
    return await this.updateUser(userId, profileData);
  },

  async getApiKey(userId: string): Promise<string | null> {
    // This should integrate with apiKeyService
    const { apiKeyService } = await import('./apiKeyService.js');
    return await apiKeyService.getUserApiKey(userId);
  },

  async regenerateApiKey(userId: string): Promise<string> {
    const { apiKeyService } = await import('./apiKeyService.js');
    return await apiKeyService.regenerateApiKey(userId);
  },

  async deleteUser(userId: string): Promise<boolean> {
    await User.findByIdAndDelete(userId);
    logger.info('User deleted successfully', { userId });
    return true;
  }
};
