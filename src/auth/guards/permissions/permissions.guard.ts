import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { PERMISSIONS_KEY } from '../../decorators/permissions.decorator.js';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface.js';
import { AppLogger } from '../../../common/logger/logger.service.js';

/** Guard global (se ejecuta después de JwtAuthGuard): valida que el usuario tenga todos los permisos de @Permissions(). */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly logger: AppLogger,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
        if (!user) {
            throw new UnauthorizedException('Usuario no autenticado en la solicitud');
        }

        const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
            user.permissions.includes(permission),
        );
        if (!hasAllRequiredPermissions) {
            this.logger.warn(`Acceso denegado al usuario ${user.id}: requiere [${requiredPermissions.join(', ')}]`);
            throw new ForbiddenException('Acceso denegado: No cuentas con los permisos suficientes para esta acción');
        }
        return true;
    }
}
