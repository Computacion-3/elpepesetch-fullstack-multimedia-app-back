import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { PERMISSIONS } from '../../auth/constants/auth.constants.js';
import { ApiAuthenticated } from '../../common/swagger/api-protected.decorator.js';
import { StatsService } from './stats.service.js';

@Controller('stats')
@ApiAuthenticated()
@ApiTags('Statistics')
export class StatsController {
    constructor(private readonly statsService: StatsService) {}

    @Get('me')
    @ApiOperation({ summary: 'Consultar las estadísticas personales del usuario autenticado' })
    @ApiResponse({
        status: 200,
        description: 'Totales de biblioteca, géneros, finalizaciones mensuales y promedio de calificación',
    })
    getPersonal(@CurrentUser() user: AuthenticatedUser) {
        return this.statsService.getPersonalStats(user.id);
    }

    @Get('global')
    @Permissions(PERMISSIONS.STATS_GLOBAL_READ)
    @ApiOperation({ summary: 'Consultar las estadísticas globales de la plataforma (administrador)' })
    @ApiResponse({
        status: 200,
        description: 'Totales de usuarios, elementos por tipo, entradas de biblioteca y reseñas',
    })
    @ApiResponse({ status: 403, description: 'Solo el administrador puede consultar estadísticas globales' })
    getGlobal() {
        return this.statsService.getGlobalStats();
    }
}
