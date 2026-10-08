import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ActivityLogsService } from './activity_logs.service.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';

@Controller('activity')
export class ActivityLogsController {
    constructor(private readonly activityLogsService: ActivityLogsService) {}

    @Get()
    findAll(@Headers('x-user-id') userId: string, @Query() query: ActivityQueryDto) {
        return this.activityLogsService.findAll(userId, query);
    }

}

export { ActivityLogsController as ActivityController };
