import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule, ObserveInstrument } from './app.module.js';
import { setupSwagger } from './common/swagger/setup-swagger.js';
import { CorsSocketIoAdapter } from './realtime/cors-socket-io.adapter.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        instrument: ObserveInstrument,
    });
    app.useWebSocketAdapter(new CorsSocketIoAdapter(app));
    const corsOrigins = (process.env.CORS_ORIGIN ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.enableCors({ origin: corsOrigins });
    setupSwagger(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
