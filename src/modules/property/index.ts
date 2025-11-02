// Models
export { Property, IProperty, PropertyStatus, TransactionType } from './property.model.js';
export { PropertyImage, IPropertyImage } from './property-image.model.js';

// Types/DTOs
export * from './property.types.js';

// Repository
export { PropertyRepository, propertyRepository } from './property.repository.js';

// Service
export { PropertyService, propertyService } from './property.service.js';

// Controller
export { PropertyController, propertyController } from './property.controller.js';

// Routes
export { default as propertyPublicRoutes } from './property.routes.js';
export { default as propertyAdminRoutes } from './property.admin.routes.js';
