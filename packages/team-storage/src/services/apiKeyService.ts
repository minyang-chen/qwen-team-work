// @ts-nocheck
import crypto from 'crypto';
import { ApiKey } from '../models/UnifiedModels';

export const apiKeyService = {
  generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  async createApiKey(userId: string, name?: string) {
    const keyValue = this.generateApiKey();
    
    const apiKey = new ApiKey({
      userId,
      apiKey: keyValue,
      createdAt: new Date()
    });
    
    await apiKey.save();
    return keyValue; // Return the actual key value for the user
  },

  async getUserApiKey(userId: string) {
    const apiKey = await ApiKey.findOne({ userId });
    return apiKey;
  },

  async regenerateApiKey(userId: string) {
    // Delete old key
    await ApiKey.deleteMany({ userId });
    
    // Create new key
    return await this.createApiKey(userId, 'Regenerated API Key');
  },

  async validateApiKey(keyValue: string) {
    const keyHash = crypto.createHash('sha256').update(keyValue).digest('hex');
    const apiKey = await ApiKey.findOne({ keyHash });
    
    if (apiKey) {
      // Update lastUsed field
      await ApiKey.findByIdAndUpdate(apiKey._id, { lastUsed: new Date() });
    }
    
    return apiKey;
  }
};
