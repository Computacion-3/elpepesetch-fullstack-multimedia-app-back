import { LibraryEntry } from '../entities/library_entry.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { LibraryStatus, MediaType } from '../enums/library.enums.js';
import { StatsService } from './stats.service.js';

describe('StatsService', () => {
    function makeEntry(
        type: MediaType,
        status: LibraryStatus,
        rating: number | null,
        genres: Array<{ id: string; name: string }>,
        completedAt: Date | null = null,
    ): LibraryEntry {
        return Object.assign(new LibraryEntry(), {
            status,
            rating,
            completedAt,
            mediaItem: Object.assign(new MediaItem(), { type, genres }),
        });
    }

    it('returns per-user entry counts, top genres, recent completions and rating average', async () => {
        const now = new Date();
        const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15));
        const oldCompletion = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 13, 15));
        const entries = [
            makeEntry(MediaType.GAME, LibraryStatus.COMPLETED, 8, [{ id: 'a', name: 'Acción' }], currentMonth),
            makeEntry(MediaType.MOVIE, LibraryStatus.IN_PROGRESS, 6, [
                { id: 'a', name: 'Acción' },
                { id: 'b', name: 'Drama' },
            ]),
            makeEntry(MediaType.BOOK, LibraryStatus.DROPPED, null, [
                { id: 'a', name: 'Acción' },
                { id: 'c', name: 'Ciencia ficción' },
            ]),
            makeEntry(MediaType.BOOK, LibraryStatus.COMPLETED, 9, [], oldCompletion),
        ];
        const libraryRepository = { find: vi.fn(async () => entries) };
        const service = new StatsService({} as never, {} as never, libraryRepository as never, {} as never);

        const stats = await service.getPersonalStats(7);

        expect(libraryRepository.find).toHaveBeenCalledWith({
            where: { user: { id: 7 } },
            relations: { mediaItem: { genres: true } },
        });
        expect(stats.entriesByType).toEqual({ GAME: 1, MOVIE: 1, BOOK: 2 });
        expect(stats.entriesByStatus).toEqual({ PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2, DROPPED: 1 });
        expect(stats.topGenres).toEqual([
            { id: 'a', name: 'Acción', count: 3 },
            { id: 'c', name: 'Ciencia ficción', count: 1 },
            { id: 'b', name: 'Drama', count: 1 },
        ]);
        expect(stats.completedByMonth).toHaveLength(12);
        expect(stats.completedByMonth.at(-1)).toMatchObject({ count: 1 });
        expect(stats.completedByMonth.reduce((sum, month) => sum + month.count, 0)).toBe(1);
        expect(stats.averageRating).toBe(7.7);
    });

    it('counts global users, media by type, library entries and reviews', async () => {
        const userRepository = { count: vi.fn(async () => 9) };
        const libraryRepository = { count: vi.fn(async () => 14) };
        const reviewRepository = { count: vi.fn(async () => 5) };
        const mediaRepository = {
            count: vi.fn(async ({ where }: { where: { type: MediaType } }) =>
                where.type === MediaType.GAME ? 4 : where.type === MediaType.MOVIE ? 3 : 7,
            ),
        };
        const service = new StatsService(
            userRepository as never,
            mediaRepository as never,
            libraryRepository as never,
            reviewRepository as never,
        );

        await expect(service.getGlobalStats()).resolves.toEqual({
            users: 9,
            mediaItemsByType: { GAME: 4, MOVIE: 3, BOOK: 7 },
            libraryEntries: 14,
            reviews: 5,
        });
    });
});
