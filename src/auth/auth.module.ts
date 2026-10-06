import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { UserModule } from './user/user.module.js';
import { RoleModule } from './role/role.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import {JwtStrategy} from './strategies/jwt.strategy.js';
import { PermissionModule } from './permission/permission.module.js';

@Module({
    imports: [
        UserModule,
        RoleModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET') || 'defaultSecret',
                signOptions: {
                    expiresIn: config.get<StringValue | number>('JWT_EXPIRES_IN') || '1h',
                },
            }),
        }),
        PermissionModule,
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
})
export class AuthModule {}
