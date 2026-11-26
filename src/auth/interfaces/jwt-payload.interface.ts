export interface JwtPayload {
    sub: string;
    email: string;
    jti: string;
    /** Solo en el ticket del WebSocket: 'socket'. Los tokens de sesión no lo llevan. */
    typ?: string;
    /** JTI and expiration of the user session that requested a socket ticket. */
    sessionJti?: string;
    sessionExp?: number;
    iat?: number;
    exp?: number;
}
