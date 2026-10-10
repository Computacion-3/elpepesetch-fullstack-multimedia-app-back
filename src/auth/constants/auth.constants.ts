/** Rol que se asigna por defecto a quien se registra. */
export const DEFAULT_ROLE_NAME = 'USER';

/** Nombres de permisos usados por el decorador @Permissions(). */
export const PERMISSIONS = {
    USERS_MANAGE: 'users:manage',
    ROLES_MANAGE: 'roles:manage',
    PERMISSIONS_MANAGE: 'permissions:manage',
    REVIEWS_CREATE: 'reviews:create',
    REVIEWS_UPDATE: 'reviews:update',
    REVIEWS_DELETE: 'reviews:delete',
    REVIEWS_MODERATE: 'reviews:moderate',
    REPORTS_CREATE: 'reports:create',
    STATS_GLOBAL_READ: 'stats:read_global',
} as const;
