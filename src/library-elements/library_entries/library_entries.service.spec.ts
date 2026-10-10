import { BadRequestException, ConflictException } from '@nestjs/common';
import { LibraryEntriesService } from './library_entries.service.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ApprovalStatus, LibraryStatus, MediaType } from '../enums/library.enums.js';

describe('LibraryEntriesService', () => {
    const mediaItem = Object.assign(new MediaItem(), {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Book',
        creator: 'Author',
        type: MediaType.BOOK,
        pages: 100,
        durationMinutes: null,
        releaseYear: 2024,
        approvalStatus: ApprovalStatus.APPROVED,
        averageRating: 0,
        ratingsCount: 0,
        genres: [],
        createdBy: { id: 7 },
    });

    function createService(initialEntries: LibraryEntry[] = [], media = mediaItem) {
        const entries = [...initialEntries];
        const repository = {
            create: vi.fn((value: Partial<LibraryEntry>) => Object.assign(new LibraryEntry(), value)),
            findOne: vi.fn(
                async ({ where }: any) =>
                    entries.find(
                        (entry) =>
                            entry.user?.id === where.user?.id &&
                            (entry.id === where.id || entry.mediaItem?.id === where.mediaItem?.id),
                    ) ?? null,
            ),
            find: vi.fn(async () => entries),
            save: vi.fn(async (entry: LibraryEntry) => {
                if (!entry.id) entries.push(entry);
                return entry;
            }),
            remove: vi.fn(async (entry: LibraryEntry) => {
                const index = entries.indexOf(entry);
                if (index >= 0) entries.splice(index, 1);
                return entry;
            }),
        };
        const mediaRepository = {
            findOne: vi.fn(async () => media),
            save: vi.fn(async (item: MediaItem) => item),
        };
        const activityLogsService = { logActivity: vi.fn(async () => undefined) };
        return {
            service: new LibraryEntriesService(
                repository as never,
                mediaRepository as never,
                activityLogsService as never,
            ),
            repository,
        };
    }

    it('creates a pending entry with real user and media relations', async () => {
        const { service } = createService();
        const entry = await service.create(7, { mediaItemId: mediaItem.id });
        expect(entry.status).toBe(LibraryStatus.PENDING);
        expect(entry.progress).toBe(0);
        expect(entry.user).toEqual({ id: 7 });
        expect(entry.mediaItem).toBe(mediaItem);
    });

    it('rejects duplicates and ratings while pending', async () => {
        const existing = Object.assign(new LibraryEntry(), { id: 'entry-1', user: { id: 7 }, mediaItem });
        const { service } = createService([existing]);
        await expect(service.create(7, { mediaItemId: mediaItem.id })).rejects.toBeInstanceOf(ConflictException);
        const { service: pendingService } = createService();
        await expect(pendingService.create(7, { mediaItemId: mediaItem.id, rating: 8 })).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('completes a book when progress reaches its page maximum', async () => {
        const { service } = createService();
        const entry = await service.create(7, { mediaItemId: mediaItem.id, progress: 100 });
        expect(entry.status).toBe(LibraryStatus.COMPLETED);
        expect(entry.completedAt).toBeInstanceOf(Date);
    });

    it('rejects unapproved media unless it was proposed by the same user', async () => {
        const pending = Object.assign(new MediaItem(), mediaItem, {
            approvalStatus: ApprovalStatus.PENDING,
            createdBy: { id: 8 },
        });
        const { service } = createService([], pending);
        await expect(service.create(7, { mediaItemId: pending.id })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('enforces movie limits and allows unbounded game progress', async () => {
        const movie = Object.assign(new MediaItem(), mediaItem, {
            type: MediaType.MOVIE,
            pages: null,
            durationMinutes: 90,
        });
        const movieService = createService([], movie).service;
        await expect(movieService.create(7, { mediaItemId: movie.id, progress: 91 })).rejects.toBeInstanceOf(
            BadRequestException,
        );

        const game = Object.assign(new MediaItem(), mediaItem, {
            type: MediaType.GAME,
            pages: null,
            durationMinutes: null,
        });
        const gameEntry = await createService([], game).service.create(7, { mediaItemId: game.id, progress: 500 });
        expect(gameEntry.status).toBe(LibraryStatus.IN_PROGRESS);
        expect(gameEntry.progress).toBe(500);
    });

    it('rejects negative progress and updates rating aggregates', async () => {
        const { service } = createService();
        await expect(service.create(7, { mediaItemId: mediaItem.id, progress: -1 })).rejects.toBeInstanceOf(
            BadRequestException,
        );

        const entry = await service.create(7, {
            mediaItemId: mediaItem.id,
            status: LibraryStatus.IN_PROGRESS,
            rating: 8,
        });
        expect(entry.rating).toBe(8);
        expect(mediaItem.ratingsCount).toBe(1);
        expect(mediaItem.averageRating).toBe(8);
        await service.remove(7, entry.id);
        expect(mediaItem.ratingsCount).toBe(0);
    });

    it('clears completedAt when leaving COMPLETED and toggles favorites', async () => {
        const { service } = createService();
        const entry = await service.create(7, { mediaItemId: mediaItem.id, progress: 100 });
        expect(entry.completedAt).toBeInstanceOf(Date);
        const updated = await service.update(7, entry.id, { status: LibraryStatus.DROPPED, isFavorite: true });
        expect(updated.completedAt).toBeNull();
        expect(updated.isFavorite).toBe(true);
    });
});
