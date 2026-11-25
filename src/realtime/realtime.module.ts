import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ModerationQueueListener } from './moderation-queue.listener.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
    imports: [AuthModule, NotificationsModule],
    providers: [RealtimeGateway, ModerationQueueListener],
})
export class RealtimeModule {}
