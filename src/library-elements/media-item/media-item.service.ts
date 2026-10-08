import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaItem } from '../entities/media-item.entity.js';
import { CreateMediaItemDto } from './dto/create-media-item.dto.js';
import { UpdateMediaItemDto } from './dto/update-media-item.dto.js';

@Injectable()
export class MediaItemService {
  constructor(@InjectRepository(MediaItem) private readonly repository: Repository<MediaItem>) {}
  create(createMediaItemDto: CreateMediaItemDto) {
    const { genreIds: _genreIds, ...data } = createMediaItemDto;
    return this.repository.save(this.repository.create(data));
  }

  findAll() {
    return this.repository.find({ relations: { genres: true }, order: { title: 'ASC' } });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id }, relations: { genres: true } });
    if (!entity) throw new NotFoundException(`Media item ${id} not found`);
    return entity;
  }

  async update(id: string, updateMediaItemDto: UpdateMediaItemDto) {
    const entity = await this.findOne(id);
    const { genreIds: _genreIds, ...data } = updateMediaItemDto;
    return this.repository.save(this.repository.merge(entity, data));
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { message: `Media item ${id} deleted successfully` };
  }
}
