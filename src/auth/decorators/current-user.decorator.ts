import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { getRequest } from '../../common/utils/get-request.js';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

/** Inyecta el usuario autenticado (resuelto por JwtStrategy) en un parámetro del handler (REST o GraphQL). */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = getRequest<Request & { user: AuthenticatedUser }>(context);
    return request.user;
});
