import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LibraryEntriesModule } from './library_entries/library_entries.module.js';
import { UserListsModule } from './user_lists/user_lists.module.js';
import { ActivityLogsModule } from './activity_logs/activity_logs.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
    imports: [
        // Distributed tracing, auto-correlated logs, request/job metrics, error
        // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
        ObserveModule.forRoot({
            appKey: 'YOUR_APP_KEY',
            appSecret: 'YOUR_APP_SECRET',
            serviceId: 'elpepesetch-backend',
        }),
        ConfigModule.forRoot({
            isGlobal: true,
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
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: true, // Sincroniza esquemas automáticamente en desarrollo
            }),
        }),
        LibraryEntriesModule,
        UserListsModule,
        ActivityLogsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
