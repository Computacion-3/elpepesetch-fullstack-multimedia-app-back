import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReviewService } from './review.service.js';

describe('ReviewService', () => {
    const mediaItemId = '11111111-1111-4111-8111-111111111111';
    const reviewId = '22222222-2222-4222-8222-222222222222';

    function makeService(options: { eligible?: boolean; existing?: Review | null } = {}) {
        const mediaItem = Object.assign(new MediaItem(), { id: mediaItemId });
        const reviews: Review[] = options.existing ? [options.existing] : [];
        const repository = {
            create: vi.fn((value: Partial<Review>) => Object.assign(new Review(), value)),
            findOne: vi.fn(async ({ where }: any) => {
                if (where.id) return reviews.find((review) => review.id === where.id) ?? null;
                if (where.user?.id && where.mediaItem?.id) {
                    return (
                        reviews.find(
                            (review) =>
                                review.user?.id === where.user.id && review.mediaItem?.id === where.mediaItem.id,
                        ) ?? null
                    );
                }
                return null;
            }),
            findAndCount: vi.fn(async () => [reviews, reviews.length] as const),
            save: vi.fn(async (review: Review) => {
                review.id ??= reviewId;
                reviews.push(review);
                return review;
            }),
            merge: vi.fn((review: Review, dto: Partial<Review>) => Object.assign(review, dto)),
            remove: vi.fn(async (review: Review) => review),
        };
        const mediaRepository = { findOne: vi.fn(async () => mediaItem) };
        const libraryRepository = {
            findOne: vi.fn(async () => (options.eligible ? new LibraryEntry() : null)),
        };
        const activity = { logActivity: vi.fn(async () => undefined) };
        const service = new ReviewService(
            repository as never,
            mediaRepository as never,
            libraryRepository as never,
            activity as never,
        );
        return { service, repository, mediaRepository, libraryRepository, activity, reviews };
    }

    it('requires an eligible library entry and creates only one review per media item', async () => {
        const missingEntry = makeService();
        await expect(
            missingEntry.service.create(7, mediaItemId, { content: 'Una reseña que supera diez caracteres.' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        const { service, activity, reviews } = makeService({ eligible: true });
        const created = await service.create(7, mediaItemId, {
            title: 'Buena',
            content: 'Una reseña que supera diez caracteres.',
        });
        expect(created.user).toEqual({ id: 7 });
        expect(created.mediaItem).toEqual({ id: mediaItemId });
        expect(reviews).toHaveLength(1);
        expect(activity.logActivity).toHaveBeenCalledWith(7, expect.objectContaining({ mediaItemId }));
        await expect(
            service.create(7, mediaItemId, { content: 'Otra reseña que también supera diez caracteres.' }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('filters hidden reviews for readers and returns pagination metadata', async () => {
        const { service, repository } = makeService();
        const result = await service.findByMediaItem(mediaItemId, 7, false, 2, 5);
        expect(result.meta).toEqual({ total: 0, page: 2, limit: 5, totalPages: 0 });
        expect(repository.findAndCount).toHaveBeenCalledWith(
            expect.objectContaining({
                where: [
                    { mediaItem: { id: mediaItemId }, isHidden: false },
                    { mediaItem: { id: mediaItemId }, isHidden: true, user: { id: 7 } },
                ],
                skip: 5,
                take: 5,
            }),
        );
    });

    it('enforces ownership for updates and allows administrators to remove any review', async () => {
        const review = Object.assign(new Review(), {
            id: reviewId,
            user: { id: 7 },
            mediaItem: { id: mediaItemId },
            title: null,
            content: 'Texto original que supera diez caracteres.',
        });
        const { service, repository } = makeService({ existing: review });
        await expect(
            service.update(reviewId, 8, 'USER', { content: 'Texto editado que supera diez caracteres.' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        const updated = await service.update(reviewId, 7, 'USER', { title: 'Actualizada' });
        expect(updated.title).toBe('Actualizada');
        await service.remove(reviewId, 8, 'ADMIN');
        expect(repository.remove).toHaveBeenCalledWith(review);
    });

    it('only accepts the statuses eligible for review creation in the library lookup', async () => {
        const { service, libraryRepository } = makeService({ eligible: true });
        await service.create(7, mediaItemId, { content: 'Una reseña que supera diez caracteres.' });
        const criteria = (libraryRepository.findOne as any).mock.calls[0][0];
        expect(criteria.where.status._type).toBe('in');
        expect(criteria.where.status._value).toEqual(['IN_PROGRESS', 'COMPLETED', 'DROPPED']);
    });
});
