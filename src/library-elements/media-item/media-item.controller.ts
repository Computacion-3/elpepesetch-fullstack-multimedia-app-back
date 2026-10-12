import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { PERMISSIONS } from '../../auth/constants/auth.constants.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { ApiAuthenticated, ApiRequiresPermission } from '../../common/swagger/api-protected.decorator.js';
import { CreateMediaItemDto } from './dto/create-media-item.dto.js';
import { UpdateMediaItemDto } from './dto/update-media-item.dto.js';
import { MediaItemService } from './media-item.service.js';

@ApiTags('Catalog')
@Controller('media-item')
export class MediaItemController {
    constructor(private readonly mediaItemService: MediaItemService) {}

    @Post()
    @Permissions(PERMISSIONS.CATALOG_CREATE)
    @ApiRequiresPermission(PERMISSIONS.CATALOG_CREATE)
    @ApiOperation({ summary: 'Proponer un elemento para el catálogo (juego, película o libro)' })
    @ApiCreatedResponse({ description: 'Elemento creado' })
    @ApiBadRequestResponse({ description: 'Datos inválidos' })
    create(@Body() createMediaItemDto: CreateMediaItemDto) {
        return this.mediaItemService.create(createMediaItemDto);
    }

    @Get()
    @ApiAuthenticated()
    @ApiOperation({ summary: 'Listar el catálogo, ordenado por título' })
    @ApiOkResponse({ description: 'Elementos del catálogo con sus géneros' })
    findAll() {
        return this.mediaItemService.findAll();
    }

    @Get(':id')
    @ApiAuthenticated()
    @ApiOperation({ summary: 'Detalle de un elemento del catálogo con sus géneros' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Elemento del catálogo' })
    @ApiNotFoundResponse({ description: 'El elemento no existe' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.mediaItemService.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.CATALOG_UPDATE)
    @ApiRequiresPermission(PERMISSIONS.CATALOG_UPDATE)
    @ApiOperation({ summary: 'Editar un elemento del catálogo' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Elemento actualizado' })
    @ApiNotFoundResponse({ description: 'El elemento no existe' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateMediaItemDto: UpdateMediaItemDto) {
        return this.mediaItemService.update(id, updateMediaItemDto);
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
