import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogsService } from './activity_logs.service.js';
import { ActivityLogsController } from './activity_logs.controller.js';
import { ActivityLog } from '../entities/activity_log.entity.js';
import { ActivityLogsResolver } from './activity_logs.resolver.js';

@Module({
    imports: [TypeOrmModule.forFeature([ActivityLog])],
    controllers: [ActivityLogsController],
    providers: [ActivityLogsService, ActivityLogsResolver],
    exports: [ActivityLogsService],
})
export class ActivityLogsModule {}

export { ActivityLogsModule as ActivityModule };
