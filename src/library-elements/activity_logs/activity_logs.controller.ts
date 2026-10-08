import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ApiAuthenticated } from '../../common/swagger/api-protected.decorator.js';
import { ActivityLogsService } from './activity_logs.service.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';

@Controller('activity')
@ApiAuthenticated()
@ApiTags('Activity')
export class ActivityLogsController {
    constructor(private readonly activityLogsService: ActivityLogsService) {}

    @Get()
    @ApiOperation({ summary: 'Consultar el historial de actividad propio' })
    @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, default: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 50, default: 10 })
    @ApiResponse({ status: 200, description: 'Historial paginado, ordenado por fecha descendente' })
    @ApiBadRequestResponse({ description: 'Parámetros de paginación inválidos' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ActivityQueryDto) {
        return this.activityLogsService.findAll(user.id, query);
    }
}

export { ActivityLogsController as ActivityController };
