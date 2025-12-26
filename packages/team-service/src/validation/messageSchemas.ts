import { z } from 'zod';

// Message schemas
export const ChatMessageSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.string().min(1),
  files: z.array(z.object({
    name: z.string(),
    type: z.string(),
    size: z.number().positive(),
    data: z.string()
  })).optional(),
  correlationId: z.string().optional()
});

export const AcpMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.any(),
  timestamp: z.number(),
  correlationId: z.string().optional()
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AcpMessage = z.infer<typeof AcpMessageSchema>;

export function validateMessage<T>(schema: z.ZodSchema<T>, data: unknown): { valid: boolean; data?: T; error?: string } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors.map(e => `${e.path.join('')}: ${e.message}`).join(', ') };
    }
    return { valid: false, error: 'Validation failed' };
  }
}
