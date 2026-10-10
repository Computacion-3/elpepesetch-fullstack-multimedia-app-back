import { Module } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../entities/review.entity.js';
import { ActivityLogsModule } from '../activity_logs/activity_logs.module.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([Review, MediaItem, LibraryEntry]), ActivityLogsModule],
    controllers: [ReviewController],
    providers: [ReviewService],
})
export class ReviewModule {}
