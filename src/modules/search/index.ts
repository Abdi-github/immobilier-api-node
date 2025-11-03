// Search Module Exports

// Types
export * from './search.types.js';

// Repository
export { SearchRepository, searchRepository } from './search.repository.js';

// Service
export { SearchService, searchService } from './search.service.js';

// Controller
export { searchController } from './search.controller.js';

// Validators
export {
  propertySearchValidators,
  locationSearchValidators,
  unifiedSearchValidators,
  suggestionsValidators,
  facetsValidators,
} from './search.validator.js';

// Routes
export { default as searchRoutes } from './search.routes.js';
export { default as searchAdminRoutes } from './search.admin.routes.js';
