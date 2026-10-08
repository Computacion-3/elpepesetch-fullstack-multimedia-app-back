import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule, ObserveInstrument } from './app.module.js';
import { setupSwagger } from './common/swagger/setup-swagger.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        instrument: ObserveInstrument,
    });
    setupSwagger(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(process.env.PORT ?? 3000);
    await bootstrap();
}
