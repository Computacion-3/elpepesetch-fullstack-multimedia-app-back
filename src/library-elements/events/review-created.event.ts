/** Datos públicos de una reseña nueva; el ID del elemento solo se usa para elegir la sala. */
export interface ReviewCreatedEvent {
    mediaItemId: string;
    reviewId: string;
    title: string | null;
    username: string;
}
