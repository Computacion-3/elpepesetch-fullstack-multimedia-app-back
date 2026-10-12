import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { ApiAuthenticated, ApiRequiresPermission } from '../../common/swagger/api-protected.decorator.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { UpdateGenreDto } from './dto/update-genre.dto.js';
import { GenreService } from './genre.service.js';

@ApiTags('Genres')
@Controller('genres')
export class GenreController {
    constructor(private readonly genreService: GenreService) {}

    @Post()
    @Permissions(PERMISSIONS.GENRES_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.GENRES_MANAGE)
    @ApiOperation({ summary: 'Crear un género (administrador)' })
    @ApiCreatedResponse({ description: 'Género creado' })
    @ApiBadRequestResponse({ description: 'Datos inválidos' })
    @ApiConflictResponse({ description: 'Ya existe un género con ese nombre' })
    create(@Body() createGenreDto: CreateGenreDto) {
        return this.genreService.create(createGenreDto);
    }

    @Get()
    @ApiAuthenticated()
    @ApiOperation({ summary: 'Listar todos los géneros' })
    @ApiOkResponse({ description: 'Géneros ordenados por nombre' })
    findAll() {
        return this.genreService.findAll();
    }

    @Get(':id')
    @ApiAuthenticated()
    @ApiOperation({ summary: 'Detalle de un género' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Género' })
    @ApiNotFoundResponse({ description: 'El género no existe' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.genreService.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.GENRES_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.GENRES_MANAGE)
    @ApiOperation({ summary: 'Editar un género (administrador)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Género actualizado' })
    @ApiNotFoundResponse({ description: 'El género no existe' })
    @ApiConflictResponse({ description: 'Ya existe un género con ese nombre' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateGenreDto: UpdateGenreDto) {
        return this.genreService.update(id, updateGenreDto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.GENRES_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.GENRES_MANAGE)
    @ApiOperation({ summary: 'Eliminar un género (administrador)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Género eliminado' })
    @ApiNotFoundResponse({ description: 'El género no existe' })
    @ApiConflictResponse({ description: 'El género está asignado a elementos del catálogo' })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.genreService.remove(id);
    }
}
