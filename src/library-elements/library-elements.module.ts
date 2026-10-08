import { Module } from '@nestjs/common';
import { LibraryElementsService } from './library-elements.service.js';
import { LibraryElementsController } from './library-elements.controller.js';
import { GenreModule } from './genre/genre.module.js';
import { MediaItemModule } from './media-item/media-item.module.js';
import { LibraryEntriesModule } from './library_entries/library_entries.module.js';
import { UserListsModule } from './user_lists/user_lists.module.js';
import { ReviewModule } from './review/review.module.js';
import { ReviewReportModule } from './review-report/review-report.module.js';
import { ActivityLogsModule } from './activity_logs/activity_logs.module.js';
import { RevokedTokenModule } from './revoked-token/revoked-token.module.js';

@Module({
  controllers: [LibraryElementsController],
  providers: [LibraryElementsService],
  imports: [GenreModule, MediaItemModule, LibraryEntriesModule, UserListsModule, ReviewModule, ReviewReportModule, ActivityLogsModule, RevokedTokenModule],
})
export class LibraryElementsModule {}
