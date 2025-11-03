import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { propertyTranslationController } from './property-translation.controller.js';
import {
  propertyIdParamValidator,
  languageParamValidator,
} from './property-translation.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/public/properties/:propertyId/translations
 * @desc    Get all approved translations for a property
 * @access  Public
 */
router.get(
  '/properties/:propertyId/translations',
  propertyIdParamValidator,
  validate,
  propertyTranslationController.getByPropertyId
);

/**
 * @route   GET /api/v1/public/properties/:propertyId/translations/:language
 * @desc    Get approved translation for a property by language
 * @access  Public
 */
router.get(
  '/properties/:propertyId/translations/:language',
  [...propertyIdParamValidator, ...languageParamValidator],
  validate,
  propertyTranslationController.getByPropertyAndLanguage
);

export default router;
