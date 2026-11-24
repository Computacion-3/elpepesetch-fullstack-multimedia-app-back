import { ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

/** Devuelve la petición HTTP en REST y en GraphQL (donde viaja dentro del contexto de Apollo). */
export function getRequest<T = Request>(context: ExecutionContext): T {
    if (context.getType<GqlContextType>() === 'graphql') {
        return GqlExecutionContext.create(context).getContext<{ req: T }>().req;
    }
    return context.switchToHttp().getRequest<T>();
}
