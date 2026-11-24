import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

import { Public } from '../auth/decorators/public.decorator.js';

export interface HealthStatus {
    status: 'ok' | 'error';
    database: 'up' | 'down';
    /** Commit desplegado (Render define RENDER_GIT_COMMIT). El CD lo compara con el commit que mandó a desplegar. */
    commit: string | null;
    uptimeSeconds: number;
}

/**
 * Salud del servicio. Lo usan Render (Health Check Path: no enruta tráfico a una instancia nueva
 * hasta que responda 200) y el pipeline de CD (verifica que quedó desplegado el commit correcto).
 */
@ApiTags('App')
@Controller('health')
export class HealthController {
    constructor(private readonly dataSource: DataSource) {}

    @Get()
    @Public()
    @ApiOperation({ summary: 'Salud del servicio: base de datos y commit desplegado (público)' })
    @ApiOkResponse({ description: '{ status: "ok", database: "up", commit, uptimeSeconds }' })
    @ApiServiceUnavailableResponse({ description: 'La base de datos no responde' })
    async check(): Promise<HealthStatus> {
        const database = await this.pingDatabase();
        const health: HealthStatus = {
            status: database === 'up' ? 'ok' : 'error',
            database,
            commit: process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? null,
            uptimeSeconds: Math.round(process.uptime()),
        };
        if (health.status !== 'ok') {
            throw new ServiceUnavailableException(health);
        }
        return health;
    }

    private async pingDatabase(): Promise<'up' | 'down'> {
        try {
            await this.dataSource.query('SELECT 1');
            return 'up';
        } catch {
            return 'down';
        }
    }
}
