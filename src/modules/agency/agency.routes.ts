import { Router } from 'express';
import { agencyController } from './agency.controller.js';
import {
  listAgenciesValidator,
  getAgencyByIdValidator,
  getAgencyBySlugValidator,
  getAgenciesByCantonValidator,
  getAgenciesByCityValidator,
} from './agency.validator.js';
import { validate } from '../../shared/middlewares/index.js';

const router = Router();

/**
 * @route   GET /api/v1/public/agencies
 * @desc    Get all agencies (paginated)
 * @access  Public
 */
router.get('/', listAgenciesValidator, validate, agencyController.getAll);

/**
 * @route   GET /api/v1/public/agencies/slug/:slug
 * @desc    Get agency by slug
 * @access  Public
 */
router.get('/slug/:slug', getAgencyBySlugValidator, validate, agencyController.getBySlug);

/**
 * @route   GET /api/v1/public/agencies/canton/:cantonId
 * @desc    Get agencies by canton
 * @access  Public
 */
router.get(
  '/canton/:cantonId',
  getAgenciesByCantonValidator,
  validate,
  agencyController.getByCanton
);

/**
 * @route   GET /api/v1/public/agencies/city/:cityId
 * @desc    Get agencies by city
 * @access  Public
 */
router.get('/city/:cityId', getAgenciesByCityValidator, validate, agencyController.getByCity);

/**
 * @route   GET /api/v1/public/agencies/:id
 * @desc    Get agency by ID
 * @access  Public
 */
router.get('/:id', getAgencyByIdValidator, validate, agencyController.getById);

export { router as agencyRouter };
export default router;
