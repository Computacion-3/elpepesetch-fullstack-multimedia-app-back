export interface JwtPayload {
    sub: string;
    email: string;
    jti: string;
    /** Solo en el ticket del WebSocket: 'socket'. Los tokens de sesión no lo llevan. */
    typ?: string;
    iat?: number;
    exp?: number;
}
