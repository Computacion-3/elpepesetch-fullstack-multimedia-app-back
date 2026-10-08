import { Module } from '@nestjs/common';
import { LibraryEntryService } from './library-entry.service.js';
import { LibraryEntryController } from './library-entry.controller.js';

@Module({
  controllers: [LibraryEntryController],
  providers: [LibraryEntryService],
})
export class LibraryEntryModule {}
