import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity.js';
import { CreateActivityLogDto } from './dto/create-activity-log.dto.js';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto.js';

@Injectable()
export class ActivityLogService {
  constructor(@InjectRepository(ActivityLog) private readonly repository: Repository<ActivityLog>) {}
  create(createActivityLogDto: CreateActivityLogDto) {
    const { userId: _userId, ...data } = createActivityLogDto;
    return this.repository.save(this.repository.create(data));
  }

  findAll() {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Activity log ${id} not found`);
    return entity;
  }

  async update(id: string, updateActivityLogDto: UpdateActivityLogDto) {
    const entity = await this.findOne(id);
    return this.repository.save(this.repository.merge(entity, updateActivityLogDto));
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { message: `Activity log ${id} deleted successfully` };
  }
}
