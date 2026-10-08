import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service.js';
import { ActivityLogController } from './activity-log.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../entities/activity-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
})
export class ActivityLogModule {}
