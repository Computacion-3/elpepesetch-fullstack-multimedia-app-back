import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ClassSerializerInterceptor, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt/jwt-auth.guard.js';
import { PermissionsGuard } from './auth/guards/permissions/permissions.guard.js';
import { LoggerModule } from './common/logger/logger.module.js';
import { HealthController } from './health/health.controller.js';
import { LibraryElementsModule } from './library-elements/library-elements.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ObserveModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                appKey: configService.get<string>('OBSERVE_APP_KEY') ?? '',
                appSecret: configService.get<string>('OBSERVE_APP_SECRET') ?? '',
                serviceId: configService.get<string>('OBSERVE_SERVICE_ID') ?? 'elpepesetch-backend',
            }),
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('POSTGRES_PORT'),
                username: configService.get<string>('POSTGRES_USER'),
                password: configService.get<string>('POSTGRES_PASSWORD'),
                database: configService.get<string>('POSTGRES_DB'),
                // Supabase y las conexiones externas de Render exigen SSL; en local queda apagado.
                ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
                autoLoadEntities: true,
                synchronize: true,
            }),
        }),
        // GraphQL en /graphql (esquema code-first en memoria). Los guards globales también lo protegen.
        GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true, sortSchema: true }),
        LoggerModule,
        AuthModule,
        LibraryElementsModule,
    ],
    controllers: [AppController, HealthController],
    providers: [
        AppService,
        // Orden de ejecución: 1) autenticación (JWT) -> 2) autorización (permisos del rol)
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        // DTOs: descarta propiedades no declaradas y rechaza las desconocidas (evita mass-assignment, p. ej. `roleId`)
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
        },
        // Respeta @Exclude() de las entidades (p. ej. passwordHash nunca sale en una respuesta)
        { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    ],
})
export class AppModule {}
