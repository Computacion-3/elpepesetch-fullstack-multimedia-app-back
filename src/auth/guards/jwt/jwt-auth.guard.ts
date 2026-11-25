import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Socket } from 'socket.io';

import { getRequest } from '../../../common/utils/get-request.js';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator.js';

/**
 * Guard global: exige un JWT válido salvo en las rutas marcadas con @Public().
 * En GraphQL obtiene req desde el contexto Apollo. En WebSocket exige el usuario validado
 * por el middleware del handshake antes de permitir mensajes autenticados.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    /** Passport busca el token en la petición; en GraphQL hay que sacarla del contexto de Apollo. */
    getRequest(context: ExecutionContext) {
        return getRequest(context);
    }

    canActivate(context: ExecutionContext) {
        if (context.getType() === 'ws') {
            const socket = context.switchToWs().getClient<Socket>();
            if (!socket.data?.user) throw new UnauthorizedException('Socket no autenticado');
            return true;
        }
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        return super.canActivate(context);
    }
}
