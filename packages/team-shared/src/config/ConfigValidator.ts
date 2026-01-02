/**
 * Configuration validation schema for team packages
 * Adapted from CLI's settings schema
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface TeamConfig {
  server: {
    port: number;
    host: string;
    cors: {
      enabled: boolean;
      origins: string[];
    };
  };
  database: {
    url: string;
    name: string;
    options?: Record<string, any>;
  };
  auth: {
    enabled: boolean;
    jwtSecret?: string;
    sessionTimeout: number;
  };
  acp: {
    enabled: boolean;
    port: number;
    agents: Array<{
      name: string;
      url: string;
      enabled: boolean;
    }>;
  };
  ui: {
    theme: string;
    language: string;
    features: {
      darkMode: boolean;
      notifications: boolean;
    };
  };
}

const teamConfigSchema = {
  type: 'object',
  properties: {
    server: {
      type: 'object',
      properties: {
        port: { type: 'number', minimum: 1, maximum: 65535 },
        host: { type: 'string', minLength: 1 },
        cors: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            origins: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['enabled', 'origins'],
          additionalProperties: false
        }
      },
      required: ['port', 'host', 'cors'],
      additionalProperties: false
    },
    database: {
      type: 'object',
      properties: {
        url: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        options: {
          type: 'object',
          nullable: true,
          additionalProperties: true
        }
      },
      required: ['url', 'name'],
      additionalProperties: false
    },
    auth: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        jwtSecret: { type: 'string', nullable: true },
        sessionTimeout: { type: 'number', minimum: 60 }
      },
      required: ['enabled', 'sessionTimeout'],
      additionalProperties: false
    },
    acp: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        port: { type: 'number', minimum: 1, maximum: 65535 },
        agents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1 },
              url: { type: 'string', minLength: 1 },
              enabled: { type: 'boolean' }
            },
            required: ['name', 'url', 'enabled'],
            additionalProperties: false
          }
        }
      },
      required: ['enabled', 'port', 'agents'],
      additionalProperties: false
    },
    ui: {
      type: 'object',
      properties: {
        theme: { type: 'string', minLength: 1 },
        language: { type: 'string', minLength: 1 },
        features: {
          type: 'object',
          properties: {
            darkMode: { type: 'boolean' },
            notifications: { type: 'boolean' }
          },
          required: ['darkMode', 'notifications'],
          additionalProperties: false
        }
      },
      required: ['theme', 'language', 'features'],
      additionalProperties: false
    }
  },
  required: ['server', 'database', 'auth', 'acp', 'ui'],
  additionalProperties: false
};

export class ConfigValidator {
  private ajv: Ajv;
  private validate: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.validate = this.ajv.compile(teamConfigSchema);
  }

  validateConfig(config: unknown): { valid: boolean; errors?: string[] } {
    const valid = this.validate(config);
    
    if (!valid) {
      const errors = this.validate.errors?.map((error: any) => {
        const path = error.instancePath || 'root';
        return `${path}: ${error.message}`;
      }) || [];
      
      return { valid: false, errors };
    }
    
    return { valid: true };
  }

  getDefaultConfig(): TeamConfig {
    return {
      server: {
        port: 3000,
        host: 'localhost',
        cors: {
          enabled: true,
          origins: ['http://localhost:3001']
        }
      },
      database: {
        url: 'mongodb://localhost:27017',
        name: 'qwen-team'
      },
      auth: {
        enabled: true,
        sessionTimeout: 3600
      },
      acp: {
        enabled: true,
        port: 8080,
        agents: []
      },
      ui: {
        theme: 'qwen-light',
        language: 'en',
        features: {
          darkMode: false,
          notifications: true
        }
      }
    };
  }
}

export const configValidator = new ConfigValidator();
