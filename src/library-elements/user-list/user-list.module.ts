import { Module } from '@nestjs/common';
import { UserListService } from './user-list.service.js';
import { UserListController } from './user-list.controller.js';

@Module({
  controllers: [UserListController],
  providers: [UserListService],
})
export class UserListModule {}
