import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { getRequest } from '../../../common/utils/get-request.js';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator.js';

/**
 * Guard global: exige un JWT válido salvo en las rutas marcadas con @Public().
 * En WebSockets no aplica: la conexión ya se autenticó en el handshake (createSocketAuthMiddleware)
 * y un mensaje no trae headers HTTP que Passport pueda leer.
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
