// Export enhanced AI service that uses ACP to communicate with team-ai-agent
export { createEnhancedAIService as createAIService, getEnhancedAIService as getAIService } from './EnhancedAIService.js';

// Deprecated - keeping for backward compatibility
export { AIService } from './aiService.js';
