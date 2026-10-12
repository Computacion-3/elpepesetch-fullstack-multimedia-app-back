import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { PERMISSIONS } from '../../auth/constants/auth.constants.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ApiAuthenticated, ApiRequiresPermission } from '../../common/swagger/api-protected.decorator.js';
import { ApproveMediaItemDto } from './dto/approve-media-item.dto.js';
import { CreateMediaItemDto } from './dto/create-media-item.dto.js';
import { MediaQueryDto } from './dto/media-query.dto.js';
import { UpdateMediaItemDto } from './dto/update-media-item.dto.js';
import { MediaItemService } from './media-item.service.js';

@ApiTags('Catalog')
@Controller('media')
export class MediaItemController {
    constructor(private readonly mediaItemService: MediaItemService) {}

    @Post()
    @Permissions(PERMISSIONS.CATALOG_CREATE)
    @ApiRequiresPermission(PERMISSIONS.CATALOG_CREATE)
    @ApiOperation({
        summary: 'Proponer un elemento (queda PENDING; APPROVED si lo crea un administrador)',
    })
    @ApiCreatedResponse({ description: 'Elemento creado' })
    @ApiBadRequestResponse({ description: 'Datos inválidos, año fuera de rango o géneros inexistentes' })
    @ApiConflictResponse({ description: 'Ya existe un elemento con ese título, tipo y año' })
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMediaItemDto) {
        return this.mediaItemService.create(user, dto);
    }

    @Get()
    @ApiAuthenticated()
    @ApiOperation({
        summary: 'Catálogo aprobado con filtros y paginación; incluye los pendientes propuestos por quien consulta',
    })
    @ApiOkResponse({ description: '{ data, meta: { total, page, limit, totalPages } }' })
    @ApiBadRequestResponse({ description: 'Parámetros de consulta inválidos' })
    findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: MediaQueryDto) {
        return this.mediaItemService.findAll(user, query);
    }

    // Declarada antes de ':id' para que «pending» no se interprete como un id
    @Get('pending')
    @Permissions(PERMISSIONS.CATALOG_MODERATE)
    @ApiRequiresPermission(PERMISSIONS.CATALOG_MODERATE)
    @ApiOperation({ summary: 'Elementos pendientes de aprobación (moderador)' })
    @ApiOkResponse({ description: '{ data, meta }, los más antiguos primero' })
    findPending(@Query() query: MediaQueryDto) {
        return this.mediaItemService.findPending(query);
    }

    @Get(':id')
    @ApiAuthenticated()
    @ApiOperation({ summary: 'Detalle con géneros, promedio y cantidad de calificaciones' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Elemento del catálogo' })
    @ApiNotFoundResponse({ description: 'No existe, o es un pendiente de otro usuario' })
    findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
        return this.mediaItemService.findOne(user, id);
    }

    @Patch(':id/approval')
    @Permissions(PERMISSIONS.CATALOG_MODERATE)
    @ApiRequiresPermission(PERMISSIONS.CATALOG_MODERATE)
    @ApiOperation({ summary: 'Aprobar o rechazar (con rejectionReason) un elemento pendiente (moderador)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Elemento revisado' })
    @ApiBadRequestResponse({ description: 'Estado inválido o rechazo sin motivo' })
    @ApiNotFoundResponse({ description: 'El elemento no existe' })
    @ApiConflictResponse({ description: 'El elemento ya fue revisado' })
    setApproval(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveMediaItemDto) {
        return this.mediaItemService.setApproval(id, dto);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.CATALOG_UPDATE)
    @ApiRequiresPermission(PERMISSIONS.CATALOG_UPDATE)
    @ApiOperation({ summary: 'Editar: el creador mientras esté PENDING; el administrador siempre' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Elemento actualizado' })
    @ApiNotFoundResponse({ description: 'El elemento no existe' })
    @ApiConflictResponse({ description: 'Ya existe un elemento con ese título, tipo y año' })
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateMediaItemDto,
    ) {
        return this.mediaItemService.update(user, id, dto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.CATALOG_DELETE)
    @ApiRequiresPermission(PERMISSIONS.CATALOG_DELETE)
    @ApiOperation({ summary: 'Eliminar un elemento del catálogo (administrador)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Elemento eliminado' })
    @ApiNotFoundResponse({ description: 'El elemento no existe' })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.mediaItemService.remove(id);
    }
}
