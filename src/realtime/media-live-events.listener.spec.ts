import { MediaLiveEventsListener } from './media-live-events.listener.js';

describe('MediaLiveEventsListener', () => {
    it('forwards rating totals only to the selected media room', () => {
        const events = { emit: vi.fn() };
        const listener = new MediaLiveEventsListener(events as any);
        const event = {
            mediaItemId: '11111111-1111-4111-8111-111111111111',
            averageRating: 8.5,
            ratingsCount: 2,
        };

        listener.forwardRating(event);

        expect(events.emit).toHaveBeenCalledWith('realtime.direct', {
            room: 'media:' + event.mediaItemId,
            event: 'media.rating.updated',
            payload: event,
        });
    });

    it('does not include the media room identifier in a new review payload', () => {
        const events = { emit: vi.fn() };
        const listener = new MediaLiveEventsListener(events as any);
        const event = {
            mediaItemId: '11111111-1111-4111-8111-111111111111',
            reviewId: '22222222-2222-4222-8222-222222222222',
            title: 'Lectura recomendada',
            username: 'lector',
        };

        listener.forwardReview(event);

        expect(events.emit).toHaveBeenCalledWith('realtime.direct', {
            room: 'media:' + event.mediaItemId,
            event: 'review.created',
            payload: { reviewId: event.reviewId, title: event.title, username: event.username },
        });
    });
});
