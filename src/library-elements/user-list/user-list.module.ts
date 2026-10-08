import { Module } from '@nestjs/common';
import { UserListService } from './user-list.service.js';
import { UserListController } from './user-list.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserList } from '../entities/user-list.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserList])],
  controllers: [UserListController],
  providers: [UserListService],
})
export class UserListModule {}
