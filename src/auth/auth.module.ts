import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';

import { UserModule } from './user/user.module.js';
import { RoleModule } from './role/role.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PermissionModule } from './permission/permission.module.js';
import { RevokedToken } from './entities/revoked-token.entity.js';

@Module({
    imports: [
        UserModule,
        RoleModule,
        TypeOrmModule.forFeature([RevokedToken]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>('JWT_SECRET');
                if (!secret) {
                    throw new Error('La variable de entorno JWT_SECRET no está configurada');
                }
                return {
                    secret,
                    signOptions: {
                        expiresIn: config.get<StringValue | number>('JWT_EXPIRES_IN') || '1h',
                    },
                };
            },
        }),
        PermissionModule,
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
})
export class AuthModule {}
