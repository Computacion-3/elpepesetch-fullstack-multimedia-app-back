import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import type { Request } from 'express';
import type { Socket } from 'socket.io';

import { PERMISSIONS_KEY } from '../../decorators/permissions.decorator.js';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface.js';
import { AppLogger } from '../../../common/logger/logger.service.js';
import { getRequest } from '../../../common/utils/get-request.js';

type UserWithPermissions = Pick<AuthenticatedUser, 'id' | 'permissions'>;

/**
 * Guard global (se ejecuta después de JwtAuthGuard): valida que el usuario tenga todos los permisos de @Permissions().
 * Funciona en REST, GraphQL y WebSockets (en WS el usuario lo dejó el handshake en socket.data.user).
 */
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

        const isWs = context.getType() === 'ws';
        const user = isWs ? this.socketUser(context) : this.httpUser(context);
        if (!user) {
            const message = 'Usuario no autenticado en la solicitud';
            throw isWs ? new WsException(message) : new UnauthorizedException(message);
        }

        const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
            user.permissions.includes(permission),
        );
        if (!hasAllRequiredPermissions) {
            this.logger.warn(`Acceso denegado al usuario ${user.id}: requiere [${requiredPermissions.join(', ')}]`);
            const message = 'Acceso denegado: No cuentas con los permisos suficientes para esta acción';
            throw isWs ? new WsException(message) : new ForbiddenException(message);
        }
        return true;
    }

    private httpUser(context: ExecutionContext): UserWithPermissions | undefined {
        return getRequest<Request & { user?: AuthenticatedUser }>(context).user;
    }

    private socketUser(context: ExecutionContext): UserWithPermissions | undefined {
        return context.switchToWs().getClient<Socket>().data?.user as UserWithPermissions | undefined;
    }
}
