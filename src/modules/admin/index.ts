// Models
export { Permission, IPermission, IMultilingualText } from './permission.model.js';
export { Role, IRole } from './role.model.js';
export { UserRole, IUserRole } from './user-role.model.js';
export { RolePermission, IRolePermission } from './role-permission.model.js';

// Types
export * from './permission.types.js';
export * from './role.types.js';

// Services
export { PermissionService } from './permission.service.js';
export { RoleService } from './role.service.js';

// Repositories
export { PermissionRepository } from './permission.repository.js';
export { RoleRepository } from './role.repository.js';

// Controllers
export { PermissionController } from './permission.controller.js';
export { RoleController } from './role.controller.js';

// Routes
export { default as permissionAdminRoutes } from './permission.admin.routes.js';
export { default as roleAdminRoutes } from './role.admin.routes.js';
