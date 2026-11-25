import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export class CorsSocketIoAdapter extends IoAdapter {
    createIOServer(port: number, options?: ServerOptions) {
        const origins = (process.env.CORS_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
        return super.createIOServer(port, { ...options, cors: { origin: origins } } as ServerOptions);
    }
}
