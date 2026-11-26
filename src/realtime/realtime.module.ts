import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ModerationQueueListener } from './moderation-queue.listener.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { UserListEventsListener } from './user-list-events.listener.js';
import { ActivityEventsListener } from './activity-events.listener.js';
import { MediaItemModule } from '../library-elements/media-item/media-item.module.js';
import { MediaLiveEventsListener } from './media-live-events.listener.js';

@Module({
    imports: [AuthModule, NotificationsModule, MediaItemModule],
    providers: [RealtimeGateway, ModerationQueueListener, UserListEventsListener, ActivityEventsListener, MediaLiveEventsListener],
})
export class RealtimeModule {}
