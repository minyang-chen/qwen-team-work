// Use team-ui-server (API Gateway) for all requests
export const API_BASE = import.meta.env.PROD ? window.__API_BASE_URL__ || '' : 'http://localhost:8002';
