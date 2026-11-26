import { NotFoundException } from '@nestjs/common';
import { NotificationType } from './notification.entity.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
    const rows = [
        { id: 'a', user: { id: 7 }, isRead: false, createdAt: new Date('2026-01-02') },
        { id: 'b', user: { id: 7 }, isRead: true, createdAt: new Date('2026-01-01') },
    ];
    const repository = {
        findAndCount: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn((value) => value),
        save: vi.fn(async (value) => value),
    };
    const service = new NotificationsService(repository as any);

    beforeEach(() => vi.clearAllMocks());

    // Comprueba que el servicio limita las notificaciones al usuario de la sesión.
    it('returns the authenticated user’s page and applies isRead filtering', async () => {
        repository.findAndCount.mockResolvedValue([[rows[1]], 1]);
        await expect(service.findAll(7, { isRead: true, page: 2, limit: 5 })).resolves.toMatchObject({
            data: [rows[1]],
            meta: { total: 1, page: 2, limit: 5, totalPages: 1 },
        });
        expect(repository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
            where: { user: { id: 7 }, isRead: true },
            order: { createdAt: 'DESC' },
            skip: 5,
            take: 5,
        }));
    });

    it('marks only an owned notification read', async () => {
        repository.findOne.mockResolvedValue(null);
        await expect(service.markRead(8, 'a')).rejects.toBeInstanceOf(NotFoundException);
        repository.findOne.mockResolvedValue({ ...rows[0] });
        await expect(service.markRead(7, 'a')).resolves.toMatchObject({ isRead: true });
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ isRead: true }));
    });

    it('stores an event-specific notification payload', async () => {
        await service.create(7, 'event-id', NotificationType.MEDIA_MODERATED, { mediaItemId: 'media' });
        expect(repository.create).toHaveBeenCalledWith({
            user: { id: 7 },
            eventId: 'event-id',
            type: NotificationType.MEDIA_MODERATED,
            payload: { mediaItemId: 'media' },
            isRead: false,
        });
    });
});
