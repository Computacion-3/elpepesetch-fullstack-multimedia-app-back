import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UserNotFoundException } from '../../common/exceptions/index.js';
import { AuthService } from '../auth.service.js';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { UserService } from '../user/user.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private readonly usersService: UserService,
        private readonly authService: AuthService,
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('La variable de entorno JWT_SECRET no está configurada');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (!payload.jti || (await this.authService.isRevoked(payload.jti))) {
            throw new UnauthorizedException('El token fue revocado o es inválido');
        }

        // Rol y permisos se leen de la BD en cada petición: un cambio de rol aplica de inmediato
        const user = await this.usersService.findOne(Number(payload.sub), true).catch((error: unknown) => {
            if (error instanceof UserNotFoundException) {
                throw new UnauthorizedException('El token no corresponde a un usuario activo');
            }
            throw error;
        });

        if (!user.isActive) {
            throw new UnauthorizedException('La cuenta está desactivada');
        }

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role.name,
            permissions: user.role.rolePermissions?.map((rp) => rp.permission.name) ?? [],
            jti: payload.jti,
            tokenExp: payload.exp ?? 0,
        };
    }
}
