/** Datos del promedio que la sala del elemento recibe tras cambiar una calificación. */
export interface MediaRatingUpdatedEvent {
    mediaItemId: string;
    averageRating: number;
    ratingsCount: number;
}
