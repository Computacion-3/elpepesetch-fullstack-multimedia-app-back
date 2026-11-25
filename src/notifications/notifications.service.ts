import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';

@Injectable()
export class NotificationsService {
    constructor(@InjectRepository(Notification) private readonly repository: Repository<Notification>) {}

    async findAll(userId: number, query: NotificationQueryDto) {
        const where = { user: { id: userId }, ...(query.isRead === undefined ? {} : { isRead: query.isRead }) };
        const [data, total] = await this.repository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return { data, meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
    }

    async markRead(userId: number, id: string): Promise<Notification> {
        const notification = await this.repository.findOne({ where: { id, user: { id: userId } } });
        if (!notification) throw new NotFoundException('Notification not found');
        if (!notification.isRead) {
            notification.isRead = true;
            await this.repository.save(notification);
        }
        return notification;
    }

    async create(userId: number, eventId: string, type: NotificationType, payload: Record<string, unknown>) {
        const notification = this.repository.create({ user: { id: userId }, eventId, type, payload, isRead: false });
        try {
            return await this.repository.save(notification);
        } catch (error) {
            // The database's unique event_id constraint makes listener retries idempotent.
            const existing = await this.repository.findOne({ where: { eventId } });
            if (existing) return existing;
            throw error;
        }
    }
}
