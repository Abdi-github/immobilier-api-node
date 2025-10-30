import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import { UnauthorizedError, ForbiddenError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';

import { authService } from './auth.service.js';
import { AuthenticatedRequest, UserType, ADMIN_USER_TYPES } from './auth.types.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const handleAuth = async (): Promise<void> => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw UnauthorizedError('Unauthenticated. Please login.');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw UnauthorizedError('Invalid token format');
    }

    // Verify token and get user
    const user = await authService.verifyAccessToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = user;
  };

  handleAuth()
    .then(() => next())
    .catch(next);
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const handleAuth = async (): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const user = await authService.verifyAccessToken(token);
          (req as AuthenticatedRequest).user = user;
        } catch (error) {
          // Token invalid, but that's OK for optional auth
          logger.debug('Optional auth: Invalid token', { error });
        }
      }
    }
  };

  handleAuth()
    .then(() => next())
    .catch(next);
};

/**
 * Check if a user has a specific permission
 * Supports wildcard (*) for super admin access
 */
const checkPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  
  // Wildcard grants all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Direct permission match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Resource wildcard (e.g., 'properties:*' grants 'properties:read')
  const [resource] = requiredPermission.split(':');
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  // 'manage' permission grants all actions for a resource
  if (userPermissions.includes(`${resource}:manage`)) {
    return true;
  }

  return false;
};

/**
 * Authorization middleware factory
 * Checks if user has required permission(s)
 * Supports wildcard (*) permission for super admins
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const hasPermission = permissions.some((permission) =>
      checkPermission(authReq.user.permissions, permission)
    );

    if (!hasPermission) {
      logger.warn(
        `Access denied: User ${authReq.user.id} lacks permissions: ${permissions.join(', ')}`
      );
      return next(ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * Authorization middleware factory
 * Checks if user has ALL required permissions
 * Supports wildcard (*) permission for super admins
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const hasAllPermissions = permissions.every((permission) =>
      checkPermission(authReq.user.permissions, permission)
    );

    if (!hasAllPermissions) {
      logger.warn(
        `Access denied: User ${authReq.user.id} lacks all permissions: ${permissions.join(', ')}`
      );
      return next(ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * Authorization middleware factory
 * Checks if user has required role(s)
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const hasRole = roles.some((role) => authReq.user.roles.includes(role));

    if (!hasRole) {
      logger.warn(`Access denied: User ${authReq.user.id} lacks roles: ${roles.join(', ')}`);
      return next(ForbiddenError('You do not have the required role'));
    }

    next();
  };
};

/**
 * Authorization middleware factory
 * Checks if user has required user type(s)
 */
export const requireUserType = (...userTypes: UserType[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    if (!userTypes.includes(authReq.user.userType)) {
      logger.warn(
        `Access denied: User ${authReq.user.id} has type ${authReq.user.userType}, required: ${userTypes.join(', ')}`
      );
      return next(ForbiddenError('Access denied for your user type'));
    }

    next();
  };
};

/**
 * Authorization middleware
 * Checks if user belongs to the specified agency
 */
export const requireAgencyAccess = (agencyIdParam: string = 'agencyId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    // Super admins and platform admins can access any agency
    const adminTypes: UserType[] = ['super_admin', 'platform_admin'];
    if (adminTypes.includes(authReq.user.userType)) {
      return next();
    }

    // Get agency ID from params or body
    const targetAgencyId: string | undefined =
      req.params[agencyIdParam] ?? (req.body as { agency_id?: string }).agency_id;

    if (!targetAgencyId) {
      return next();
    }

    // Check if user belongs to the agency
    if (authReq.user.agencyId !== targetAgencyId) {
      logger.warn(
        `Access denied: User ${authReq.user.id} attempted to access agency ${targetAgencyId}`
      );
      return next(ForbiddenError('You can only access your own agency'));
    }

    next();
  };
};

/**
 * Agency membership middleware
 * Checks if user belongs to any agency (for agency-specific routes)
 * Admins are allowed through automatically
 */
export const requireAgencyMembership = (req: Request, _res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    return next(UnauthorizedError('Authentication required'));
  }

  // Super admins and platform admins can access any agency route
  const adminTypes: UserType[] = ['super_admin', 'platform_admin'];
  if (adminTypes.includes(authReq.user.userType)) {
    return next();
  }

  // Check if user has an agency assigned
  if (!authReq.user.agencyId) {
    logger.warn(`Access denied: User ${authReq.user.id} has no agency membership`);
    return next(ForbiddenError('You must be a member of an agency to access this resource'));
  }

  next();
};

/**
 * Self or admin access middleware
 * Allows access if user is accessing their own resource or is an admin
 */
export const selfOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const targetUserId = req.params[userIdParam];
    const adminTypes: UserType[] = ['super_admin', 'platform_admin'];

    // Allow if accessing own resource or is admin
    if (authReq.user.id === targetUserId || adminTypes.includes(authReq.user.userType)) {
      return next();
    }

    logger.warn(`Access denied: User ${authReq.user.id} attempted to access user ${targetUserId}`);
    return next(ForbiddenError('You can only access your own data'));
  };
};

/**
 * Require admin access middleware
 * Only allows super_admin and platform_admin user types
 * Use this to protect entire admin route groups
 *
 * @see ADMIN_USER_TYPES in auth.types.ts for the list of admin user types
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    return next(UnauthorizedError('Authentication required'));
  }

  if (!ADMIN_USER_TYPES.includes(authReq.user.userType)) {
    logger.warn(
      `Admin access denied: User ${authReq.user.id} (type: ${authReq.user.userType}) attempted to access admin panel`
    );
    return next(
      ForbiddenError('Access denied. Admin panel is restricted to platform administrators only.')
    );
  }

  next();
};

/**
 * Property ownership middleware factory
 * Ensures the authenticated user owns the property they are trying to modify.
 *
 * Ownership rules:
 *   - super_admin / platform_admin → bypass (can access any property)
 *   - owner (user_type) → property.owner_id must match user.id
 *   - agent / agency_admin → property.agency_id must match user.agencyId
 *
 * The property is loaded once and attached to `req.property` so downstream
 * handlers don't have to re-fetch it.
 *
 * @param propertyIdParam - The route param name for the property ID (default: 'id')
 */
export const requirePropertyOwnership = (propertyIdParam: string = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const handleOwnership = async (): Promise<void> => {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        throw UnauthorizedError('Authentication required');
      }

      // Platform admins can access any property
      if (ADMIN_USER_TYPES.includes(authReq.user.userType)) {
        return;
      }

      const propertyId = req.params[propertyIdParam];
      if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
        throw ForbiddenError('Invalid property ID');
      }

      // Lazy-load the Property model to avoid circular dependency
      const { Property } = await import('../property/property.model.js');
      const property = await Property.findById(propertyId).select('owner_id agency_id').lean();

      if (!property) {
        // Let the downstream handler deal with 404
        return;
      }

      const userId = authReq.user.id;
      const userType = authReq.user.userType;
      const userAgencyId = authReq.user.agencyId;

      let isOwner = false;

      if (userType === 'owner') {
        // Private owners: property.owner_id must match their user id
        isOwner = property.owner_id?.toString() === userId;
      } else if (userType === 'agent' || userType === 'agency_admin') {
        // Agency members: property.agency_id must match their agency
        isOwner = !!(userAgencyId && property.agency_id?.toString() === userAgencyId);
      }

      if (!isOwner) {
        logger.warn(
          `Ownership denied: User ${userId} (${userType}) attempted to access property ${propertyId}`
        );
        throw ForbiddenError('You can only manage your own properties');
      }

      // Attach property for downstream use (avoids refetching)
      (req as Record<string, unknown>).propertyOwnershipVerified = true;
    };

    handleOwnership()
      .then(() => next())
      .catch(next);
  };
};
