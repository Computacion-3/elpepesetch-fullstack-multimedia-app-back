import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ModerationQueueListener } from './moderation-queue.listener.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { UserListEventsListener } from './user-list-events.listener.js';
import { ActivityEventsListener } from './activity-events.listener.js';

@Module({
    imports: [AuthModule, NotificationsModule],
    providers: [RealtimeGateway, ModerationQueueListener, UserListEventsListener, ActivityEventsListener],
})
export class RealtimeModule {}
