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
    GENRES_MANAGE: 'genres:manage',
    CATALOG_CREATE: 'catalog:create',
    CATALOG_UPDATE: 'catalog:update',
    CATALOG_DELETE: 'catalog:delete',
    CATALOG_MODERATE: 'catalog:moderate',
} as const;

/**
 * Ticket del WebSocket: JWT corto y de un solo uso que solo sirve para el handshake de Socket.IO.
 * El frontend lo pide con el token de sesión (que vive en una cookie httpOnly y nunca llega al navegador).
 */
export const SOCKET_TOKEN = {
    /** Valor de `typ` en el payload; JwtStrategy rechaza estos tokens en HTTP. */
    TYPE: 'socket',
    /** Valor de `aud`; verifySocketToken exige esta audiencia. */
    AUDIENCE: 'socket',
    /** Vigencia en segundos: basta para abrir la conexión. */
    TTL_SECONDS: 60,
} as const;
