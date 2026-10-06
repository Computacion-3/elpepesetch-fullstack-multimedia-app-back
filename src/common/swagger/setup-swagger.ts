import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { BEARER_AUTH_NAME } from './api-protected.decorator.js';

export const SWAGGER_PATH = 'api/docs';

/** Publica la documentación OpenAPI en /api/docs (ruta pública, sin token). */
export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('ElPepeSetch - API de librerías multimedia')
        .setDescription(
            'API para gestionar bibliotecas de juegos, películas y libros. ' +
                'Para probar las rutas protegidas: haz login en `POST /auth/login`, copia el `accessToken` y pulsa **Authorize**.',
        )
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, BEARER_AUTH_NAME)
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(SWAGGER_PATH, app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
}
