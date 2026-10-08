import { Module } from '@nestjs/common';
import { MediaItemService } from './media-item.service.js';
import { MediaItemController } from './media-item.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaItem } from '../entities/media-item.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([MediaItem])],
  controllers: [MediaItemController],
  providers: [MediaItemService],
})
export class MediaItemModule {}
