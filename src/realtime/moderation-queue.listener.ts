import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import type { ModerationQueueKind } from './realtime.events.js';

@Injectable()
export class ModerationQueueListener {
    constructor(
        private readonly dataSource: DataSource,
        private readonly events: EventEmitter2,
    ) {}

    @OnEvent('moderation.queue.refresh')
    async refresh(event: { kind: ModerationQueueKind }) {
        const [counts] = await this.dataSource.query(
            `SELECT
                (SELECT COUNT(*)::integer FROM media_items WHERE approval_status = 'PENDING') AS "pendingMedia",
                (SELECT COUNT(*)::integer FROM review_reports WHERE status = 'OPEN') AS "openReports"`,
        );
        this.events.emit('realtime.direct', {
            room: 'moderators',
            event: 'moderation.queue.changed',
            payload: { kind: event.kind, pendingMedia: counts.pendingMedia, openReports: counts.openReports },
        });
    }
}
