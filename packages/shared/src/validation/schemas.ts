import { z } from 'zod';

// Environment validation schema
export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().optional(),
  QWEN_CLIENT_ID: z.string().optional(),
  QWEN_CLIENT_SECRET: z.string().optional(),
  NFS_BASE_PATH: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).default('INFO')
});

export type Environment = z.infer<typeof EnvironmentSchema>;

// Validate and parse environment variables
export function validateEnvironment(): Environment {
  try {
    return EnvironmentSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}

// Request validation schemas
export const PaginationQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const SearchQuerySchema = PaginationQuerySchema.extend({
  query: z.string().optional(),
  filters: z.record(z.unknown()).optional()
});

// User validation schemas
export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  phone: z.string().optional(),
  password: z.string().min(8)
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// Team validation schemas
export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  specialization: z.string().optional(),
  description: z.string().optional()
});

export const UpdateTeamSchema = CreateTeamSchema.partial();

export const AddTeamMemberSchema = z.object({
  userId: z.string(),
  role: z.string().default('member')
});

// File validation schemas
export const FileUploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string(),
  fileSize: z.number().positive().max(100 * 1024 * 1024), // 100MB max
  metadata: z.record(z.unknown()).optional()
});

// Project validation schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.enum(['active', 'archived', 'completed']).optional()
});

// Export type inference
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type CreateTeamRequest = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamRequest = z.infer<typeof UpdateTeamSchema>;
export type AddTeamMemberRequest = z.infer<typeof AddTeamMemberSchema>;
export type FileUploadRequest = z.infer<typeof FileUploadSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;
