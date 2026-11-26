import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { ApiAuthenticated } from '../common/swagger/api-protected.decorator.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@ApiAuthenticated()
@ApiTags('Notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: 'Consultar notificaciones propias con paginación y filtro de lectura' })
    findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) {
        return this.notificationsService.findAll(user.id, query);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Marcar como leída una notificación propia' })
    markRead(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
        return this.notificationsService.markRead(user.id, id);
    }
}
