// Use team-ui-server (API Gateway) for all requests
export const API_BASE = import.meta.env.PROD ? (window as any).__API_BASE_URL__ || '' : 'http://localhost:8002';

// Storage service for file attachments
export const STORAGE_BASE = import.meta.env.PROD ? (window as any).__STORAGE_BASE_URL__ || '' : 'http://localhost:8000';
