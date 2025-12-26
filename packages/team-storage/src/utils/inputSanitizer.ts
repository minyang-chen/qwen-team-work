// @ts-nocheck
import DOMPurify from 'isomorphic-dompurify';
import { SanitizedMessage } from '@qwen-team/shared';

class InputSanitizer {
  sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove HTML tags and scripts
    const cleaned = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // Limit length
    return cleaned.slice(0, 10000);
  }

  sanitizeMessage(message: unknown): SanitizedMessage {
    if (typeof message === 'string') {
      return this.sanitizeText(message);
    }
    
    if (Array.isArray(message)) {
      return message.map(item => this.sanitizeMessage(item));
    }
    
    if (message && typeof message === 'object') {
      const sanitized: SanitizedMessage = {};
      for (const [key, value] of Object.entries(message)) {
        sanitized[key] = this.sanitizeMessage(value);
      }
      return sanitized;
    }
    
    return message as SanitizedMessage;
  }

  validateMessageStructure(message: SanitizedMessage): boolean {
    if (!message || typeof message !== 'object') return false;
    
    // Check required fields
    if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
      const msgObj = message as Record<string, unknown>;
      if (!msgObj.type || typeof msgObj.type !== 'string') return false;
      if (!msgObj.data) return false;
    }
    
    // Check message size
    const messageStr = JSON.stringify(message);
    if (messageStr.length > 100000) return false; // 100KB limit
    
    return true;
  }
}

export const inputSanitizer = new InputSanitizer();
