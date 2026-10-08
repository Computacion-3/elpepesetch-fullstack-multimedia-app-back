import { Module } from '@nestjs/common';
import { LibraryElementsService } from './library-elements.service.js';
import { LibraryElementsController } from './library-elements.controller.js';
import { GenreModule } from './genre/genre.module.js';
import { MediaItemModule } from './media-item/media-item.module.js';
import { LibraryEntryModule } from './library-entry/library-entry.module.js';
import { UserListModule } from './user-list/user-list.module.js';
import { ReviewModule } from './review/review.module.js';
import { ReviewReportModule } from './review-report/review-report.module.js';
import { ActivityLogModule } from './activity-log/activity-log.module.js';
import { RevokedTokenModule } from './revoked-token/revoked-token.module.js';

@Module({
  controllers: [LibraryElementsController],
  providers: [LibraryElementsService],
  imports: [GenreModule, MediaItemModule, LibraryEntryModule, UserListModule, ReviewModule, ReviewReportModule, ActivityLogModule, RevokedTokenModule],
})
export class LibraryElementsModule {}
