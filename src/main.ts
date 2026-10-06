import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { setupSwagger } from './common/swagger/setup-swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
