import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from '../controllers/doctorController';
import { requireAuth } from '../middlewares/authMiddleware';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middlewares/validationMiddleware';
import {
  createDoctorSchema,
  updateDoctorSchema,
  doctorQuerySchema,
  objectIdParamSchema,
} from '../validations/doctorValidation';

const router = Router();

// Protect all Doctor endpoints with JWT authentication middleware
router.use(requireAuth);

router.get('/', validateQuery(doctorQuerySchema), getDoctors);
router.get('/:id', validateParams(objectIdParamSchema), getDoctorById);
router.post('/', validateBody(createDoctorSchema), createDoctor);
router.patch(
  '/:id',
  validateParams(objectIdParamSchema),
  validateBody(updateDoctorSchema),
  updateDoctor
);
router.delete('/:id', validateParams(objectIdParamSchema), deleteDoctor);

export default router;
