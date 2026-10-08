import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../entities/user.entity.js';
import { UserRole } from '../entities/user-role.entity.js';
import { RoleModule } from '../role/role.module.js';

import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';

@Module({
    imports: [TypeOrmModule.forFeature([User, UserRole]), RoleModule],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
