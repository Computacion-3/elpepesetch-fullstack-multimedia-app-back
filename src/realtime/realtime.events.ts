export type RealtimeDelivery = {
    room: string;
    event: string;
    payload: Record<string, unknown>;
    disconnectUser?: boolean;
};

export type ModerationQueueKind = 'MEDIA' | 'REPORT';
