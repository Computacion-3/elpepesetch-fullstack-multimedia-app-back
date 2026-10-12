import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Genre } from '../entities/genre.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { MediaItemController } from './media-item.controller.js';
import { MediaItemService } from './media-item.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([MediaItem, Genre])],
    controllers: [MediaItemController],
    providers: [MediaItemService],
})
export class MediaItemModule {}
