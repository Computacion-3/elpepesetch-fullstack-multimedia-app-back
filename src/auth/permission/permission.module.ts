import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from '../entities/permission.entity.js';

import { PermissionService } from './permission.service.js';
import { PermissionController } from './permission.controller.js';

@Module({
    imports: [TypeOrmModule.forFeature([Permission])],
    controllers: [PermissionController],
    providers: [PermissionService],
    exports: [PermissionService],
})
export class PermissionModule {}
