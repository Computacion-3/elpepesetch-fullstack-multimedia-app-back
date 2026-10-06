import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { RoleModule } from '../role/role.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([User]), RoleModule],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
