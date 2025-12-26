// @ts-nocheck
import { Router } from 'express';
import { signup, login } from '../controllers/authController.js';

const router = Router();

// Authentication routes
router.post('/signup', signup);
router.post('/login', login);

export default router;
