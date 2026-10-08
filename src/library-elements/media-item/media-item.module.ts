import { Module } from '@nestjs/common';
import { MediaItemService } from './media-item.service.js';
import { MediaItemController } from './media-item.controller.js';

@Module({
  controllers: [MediaItemController],
  providers: [MediaItemService],
})
export class MediaItemModule {}
