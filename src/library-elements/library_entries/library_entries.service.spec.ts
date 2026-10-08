import { BadRequestException, ConflictException } from '@nestjs/common';
import { LibraryEntriesService } from './library_entries.service.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import {
    LibraryApprovalStatus,
    LibraryMediaType,
    LibraryMediaContext,
    LibraryMediaItemSnapshot,
} from './library-media-context.js';
import { LibraryStatus } from '../enums/library.enums.js';

describe('LibraryEntriesService', () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const mediaItemId = '22222222-2222-4222-8222-222222222222';
    const mediaItem: LibraryMediaItemSnapshot = {
        id: mediaItemId,
        title: 'Book',
        type: LibraryMediaType.BOOK,
        releaseYear: 2024,
        genreIds: [],
        approvalStatus: LibraryApprovalStatus.APPROVED,
        pages: 100,
        createdById: null,
    };

    function createService(initialEntries: LibraryEntry[] = []) {
        const entries = [...initialEntries];
        const repository = {
            create: vi.fn((value: Partial<LibraryEntry>) => value as LibraryEntry),
            findOne: vi.fn(async ({ where }: { where: Partial<LibraryEntry> }) =>
                entries.find((entry) => entry.userId === where.userId && entry.id === where.id
                    || entry.userId === where.userId && entry.mediaItemId === where.mediaItemId) ?? null,
            ),
            find: vi.fn(async ({ where }: { where: Partial<LibraryEntry> }) =>
                entries.filter((entry) => Object.entries(where).every(([key, value]) => entry[key as keyof LibraryEntry] === value)),
            ),
            save: vi.fn(async (entry: LibraryEntry) => {
                if (!entry.id) entry.id = `entry-${entries.length + 1}`;
                if (!entries.includes(entry)) entries.push(entry);
                return entry;
            }),
            remove: vi.fn(async (entry: LibraryEntry) => {
                const index = entries.indexOf(entry);
                if (index >= 0) entries.splice(index, 1);
                return entry;
            }),
        };
        const mediaContext: LibraryMediaContext = {
            findById: vi.fn(async () => mediaItem),
            findMany: vi.fn(async () => [mediaItem]),
            updateRatingStats: vi.fn(async () => undefined),
        };
        return {
            service: new LibraryEntriesService(repository as never, undefined, mediaContext),
            repository,
            mediaContext,
        };
    }

    it('creates a pending entry with default progress', async () => {
        const { service } = createService();

        const entry = await service.create(userId, { mediaItemId });

        expect(entry.status).toBe(LibraryStatus.PENDING);
        expect(entry.progress).toBe(0);
        expect(entry.isFavorite).toBe(false);
    });

    it('rejects duplicate entries and ratings while pending', async () => {
        const existing = Object.assign(new LibraryEntry(), { id: 'entry-1', userId, mediaItemId });
        const { service } = createService([existing]);

        await expect(service.create(userId, { mediaItemId })).rejects.toBeInstanceOf(ConflictException);

        const { service: pendingService } = createService();
        await expect(pendingService.create(userId, { mediaItemId, rating: 8 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('completes a book when progress reaches its page maximum', async () => {
        const { service } = createService();

        const entry = await service.create(userId, { mediaItemId, progress: 100 });

        expect(entry.status).toBe(LibraryStatus.COMPLETED);
        expect(entry.progress).toBe(100);
        expect(entry.completedAt).toBeInstanceOf(Date);
    });
});
