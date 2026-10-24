import { Router } from 'express';
import { login, logout, getMe } from '../controllers/authController';
import { validateRequest } from '../middlewares/validationMiddleware';
import { requireAuth } from '../middlewares/authMiddleware';
import { loginSchema } from '../validations/authValidation';

const router = Router();

router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
