import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthService } from '../auth.service.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Public } from '../decorators/public.decorator.js';
import { User } from '../entities/user.entity.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import { LoginInput, RegisterInput } from './auth.inputs.js';
import { LoginResultType, UserType } from './auth.types.js';

/** Autenticación por GraphQL: delega en AuthService, igual que AuthController en REST. */
@Resolver()
export class AuthResolver {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Mutation(() => UserType, { description: 'Crea una cuenta con el rol USER' })
    register(@Args('input') input: RegisterInput): Promise<User> {
        return this.authService.register(input);
    }

    @Public()
    @Mutation(() => LoginResultType, { description: 'Devuelve un JWT y los datos básicos del usuario' })
    login(@Args('input') input: LoginInput) {
        return this.authService.login(input);
    }

    @Mutation(() => Boolean, { description: 'Revoca el token actual' })
    async logout(@CurrentUser() user: AuthenticatedUser): Promise<boolean> {
        await this.authService.logout(user);
        return true;
    }

    @Query(() => UserType, { description: 'Perfil del usuario autenticado, con su rol y permisos' })
    me(@CurrentUser() user: AuthenticatedUser): Promise<User> {
        return this.authService.me(user);
    }
}
