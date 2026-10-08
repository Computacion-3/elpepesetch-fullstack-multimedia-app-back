import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service.js';
import { CreateActivityLogDto } from './dto/create-activity-log.dto.js';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto.js';

@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  create(@Body() createActivityLogDto: CreateActivityLogDto) {
    return this.activityLogService.create(createActivityLogDto);
  }

  @Get()
  findAll() {
    return this.activityLogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityLogService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivityLogDto: UpdateActivityLogDto) {
    return this.activityLogService.update(id, updateActivityLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activityLogService.remove(id);
  }
}
