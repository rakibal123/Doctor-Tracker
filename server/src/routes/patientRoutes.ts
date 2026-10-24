import { Router } from 'express';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from '../controllers/patientController';
import { requireAuth } from '../middlewares/authMiddleware';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middlewares/validationMiddleware';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
  patientIdParamSchema,
} from '../validations/patientValidation';

const router = Router();

// Protect all Patient endpoints with JWT authentication middleware
router.use(requireAuth);

router.get('/', validateQuery(patientQuerySchema), getPatients);
router.get('/:id', validateParams(patientIdParamSchema), getPatientById);
router.post('/', validateBody(createPatientSchema), createPatient);
router.patch(
  '/:id',
  validateParams(patientIdParamSchema),
  validateBody(updatePatientSchema),
  updatePatient
);
router.delete('/:id', validateParams(patientIdParamSchema), deletePatient);

export default router;
