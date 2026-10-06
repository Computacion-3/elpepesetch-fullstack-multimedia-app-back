import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from '../entities/permission.entity.js';
import { RolePermission } from '../entities/role-permission.entity.js';
import { Role } from '../entities/role.entity.js';

import { RoleService } from './role.service.js';
import { RoleController } from './role.controller.js';

@Module({
    imports: [TypeOrmModule.forFeature([Role, RolePermission, Permission])],
    controllers: [RoleController],
    providers: [RoleService],
    exports: [RoleService],
})
export class RoleModule {}
