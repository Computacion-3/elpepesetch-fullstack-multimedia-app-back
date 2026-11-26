import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthService } from '../auth.service.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Public } from '../decorators/public.decorator.js';
import { User } from '../entities/user.entity.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import { UserService } from '../user/user.service.js';
import { LoginInput, RegisterInput, UpdateProfileInput } from './auth.inputs.js';
import { LoginResultType, SocketTokenType, UserType } from './auth.types.js';

/** Autenticación por GraphQL: delega en AuthService, igual que AuthController en REST. */
@Resolver()
export class AuthResolver {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}

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

    @Mutation(() => SocketTokenType, { description: 'Ticket de un solo uso (60 s) para el handshake de Socket.IO' })
    socketToken(@CurrentUser() user: AuthenticatedUser): SocketTokenType {
        return this.authService.issueSocketToken(user);
    }

    @Query(() => UserType, { description: 'Perfil del usuario autenticado, con su rol y permisos' })
    me(@CurrentUser() user: AuthenticatedUser): Promise<User> {
        return this.authService.me(user);
    }

    @Mutation(() => UserType, { description: 'Edita el perfil propio (igual que PATCH /users/me); no permite cambiar el rol' })
    async updateProfile(
        @CurrentUser() user: AuthenticatedUser,
        @Args('input') input: UpdateProfileInput,
    ): Promise<User> {
        await this.userService.updateProfile(user.id, input);
        // Se devuelve el perfil completo (rol y permisos) como en `me`.
        return this.authService.me(user);
    }
}
