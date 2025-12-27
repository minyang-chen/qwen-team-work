import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const PORT = parseInt(process.env.PORT || '8001', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || '';
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'qwen-coder-plus';
