import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ActivityLogsService } from './activity_logs.service.js';

@Controller('activity')
export class ActivityLogsController {
    constructor(private readonly activityLogsService: ActivityLogsService) {}

    @Get()
    findAll(@Headers('x-user-id') userId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
        return this.activityLogsService.findAll(userId, Number(page) || 1, Number(limit) || 10);
    }
}
