import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserListsService } from './user_lists.service.js';
import { UserListsController } from './user_lists.controller.js';
import { UserList } from './entities/user_list.entity.js';
import { ActivityLogsModule } from '../activity_logs/activity_logs.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserList]), ActivityLogsModule],
  controllers: [UserListsController],
  providers: [UserListsService],
})
export class UserListsModule {}
