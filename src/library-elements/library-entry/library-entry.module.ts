import { Module } from '@nestjs/common';
import { LibraryEntryService } from './library-entry.service.js';
import { LibraryEntryController } from './library-entry.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryEntry } from '../entities/library-entry.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryEntry])],
  controllers: [LibraryEntryController],
  providers: [LibraryEntryService],
})
export class LibraryEntryModule {}
