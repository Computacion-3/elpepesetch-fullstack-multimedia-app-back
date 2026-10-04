import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryEntriesService } from './library_entries.service.js';
import { LibraryEntriesController } from './library_entries.controller.js';
import { LibraryEntry } from './entities/library_entry.entity.js';
import { ActivityLogsModule } from '../activity_logs/activity_logs.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryEntry]), ActivityLogsModule],
  controllers: [LibraryEntriesController],
  providers: [LibraryEntriesService],
})
export class LibraryEntriesModule {}
