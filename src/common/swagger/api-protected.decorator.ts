import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

/** Nombre del esquema de seguridad Bearer registrado en DocumentBuilder (ver setup-swagger.ts). */
export const BEARER_AUTH_NAME = 'access-token';

/** Ruta que exige un JWT válido (401 si falta, es inválido, expiró o fue revocado). */
export const ApiAuthenticated = () =>
    applyDecorators(
        ApiBearerAuth(BEARER_AUTH_NAME),
        ApiUnauthorizedResponse({ description: 'Falta el token, es inválido, expiró o fue revocado' }),
    );

/** Ruta que además exige permisos concretos (403 si el rol no los tiene). */
export const ApiRequiresPermission = (...permissions: string[]) =>
    applyDecorators(
        ApiAuthenticated(),
        ApiForbiddenResponse({ description: `El rol del usuario no tiene el permiso requerido: ${permissions.join(', ')}` }),
    );
