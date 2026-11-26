import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { MediaRatingUpdatedEvent } from '../library-elements/events/media-rating-updated.event.js';
import type { ReviewCreatedEvent } from '../library-elements/events/review-created.event.js';
import { mediaRoom, type RealtimeDelivery } from './realtime.events.js';

@Injectable()
export class MediaLiveEventsListener {
    constructor(private readonly events: EventEmitter2) {}

    // Envía a la sala del elemento el promedio guardado por LibraryEntriesService.
    @OnEvent('media.rating.updated')
    forwardRating(event: MediaRatingUpdatedEvent) {
        const delivery: RealtimeDelivery = {
            room: mediaRoom(event.mediaItemId),
            event: 'media.rating.updated',
            payload: event,
        };
        this.events.emit('realtime.direct', delivery);
    }

    // Envía la reseña nueva a su sala sin incluir el ID del elemento en el payload.
    @OnEvent('review.created')
    forwardReview(event: ReviewCreatedEvent) {
        const { mediaItemId, ...payload } = event;
        const delivery: RealtimeDelivery = {
            room: mediaRoom(mediaItemId),
            event: 'review.created',
            payload,
        };
        this.events.emit('realtime.direct', delivery);
    }
}
