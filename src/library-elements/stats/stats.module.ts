import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { Review } from '../entities/review.entity.js';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([User, MediaItem, LibraryEntry, Review])],
    controllers: [StatsController],
    providers: [StatsService],
})
export class StatsModule {}
