import { Injectable } from '@nestjs/common';
import { CreateMediaItemDto } from './dto/create-media-item.dto.js';
import { UpdateMediaItemDto } from './dto/update-media-item.dto.js';

@Injectable()
export class MediaItemService {
  create(createMediaItemDto: CreateMediaItemDto) {
    return 'This action adds a new mediaItem';
  }

  findAll() {
    return `This action returns all mediaItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mediaItem`;
  }

  update(id: number, updateMediaItemDto: UpdateMediaItemDto) {
    return `This action updates a #${id} mediaItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} mediaItem`;
  }
}
