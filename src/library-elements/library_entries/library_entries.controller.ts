import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ApiAuthenticated, ApiRequiresPermission } from '../../common/swagger/api-protected.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../auth/constants/auth.constants.js';
import { PositiveIntPipe } from '../../common/pipes/positive-int-pipe.js';
import { LibraryEntriesService } from './library_entries.service.js';
import { CreateLibraryEntryDto } from './dto/create-library_entry.dto.js';
import { LibraryQueryDto } from './dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library_entry.dto.js';

@Controller('library')
@ApiAuthenticated()
@ApiTags('Library')
export class LibraryEntriesController {
    constructor(private readonly libraryEntriesService: LibraryEntriesService) {}

    @Post()
    @ApiOperation({ summary: 'Agregar un elemento a la biblioteca personal' })
    @ApiBody({ type: CreateLibraryEntryDto })
    @ApiResponse({ status: 201, description: 'Entrada creada' })
    @ApiResponse({ status: 400, description: 'Datos o regla de negocio inválida' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    @ApiResponse({ status: 409, description: 'El elemento ya existe en la biblioteca' })
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLibraryEntryDto) {
        return this.libraryEntriesService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Consultar la biblioteca propia' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'] })
    @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
    @ApiQuery({ name: 'q', required: false, type: String })
    @ApiQuery({ name: 'type', required: false, enum: ['GAME', 'MOVIE', 'BOOK'] })
    @ApiQuery({ name: 'genreId', required: false, type: String, format: 'uuid' })
    @ApiQuery({ name: 'year', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['title', 'releaseYear', 'averageRating', 'addedAt'] })
    @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
    @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, default: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 50, default: 10 })
    @ApiResponse({ status: 200, description: 'Biblioteca paginada' })
    @ApiBadRequestResponse({ description: 'Parámetros de filtro o paginación inválidos' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: LibraryQueryDto) {
        return this.libraryEntriesService.findAll(user.id, query);
    }

    @Get('user/:userId')
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({ summary: 'Consultar la biblioteca de otro usuario (administrador)' })
    @ApiParam({ name: 'userId', type: Number, description: 'Identificador del usuario objetivo', example: 7 })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'] })
    @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
    @ApiQuery({ name: 'q', required: false, type: String })
    @ApiQuery({ name: 'type', required: false, enum: ['GAME', 'MOVIE', 'BOOK'] })
    @ApiQuery({ name: 'genreId', required: false, type: String, format: 'uuid' })
    @ApiQuery({ name: 'year', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['title', 'releaseYear', 'averageRating', 'addedAt'] })
    @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
    @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, default: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 50, default: 10 })
    @ApiResponse({ status: 200, description: 'Biblioteca paginada del usuario solicitado' })
    @ApiBadRequestResponse({ description: 'Identificador o parámetros de filtro inválidos' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    @ApiResponse({ status: 403, description: 'El rol no tiene permiso de administración' })
    findByUser(@Param('userId', ParseIntPipe, PositiveIntPipe) userId: number, @Query() query: LibraryQueryDto) {
        return this.libraryEntriesService.findAll(userId, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Consultar una entrada propia' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Entrada encontrada' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    @ApiResponse({ status: 404, description: 'Entrada inexistente o no pertenece al usuario' })
    findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
        return this.libraryEntriesService.findOne(user.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Modificar una entrada propia' })
    @ApiBody({ type: UpdateLibraryEntryDto })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Entrada actualizada' })
    @ApiResponse({ status: 400, description: 'Datos o regla de negocio inválida' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    @ApiResponse({ status: 404, description: 'Entrada inexistente o no pertenece al usuario' })
    update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLibraryEntryDto) {
        return this.libraryEntriesService.update(user.id, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar una entrada propia' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 204, description: 'Entrada eliminada' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    @ApiResponse({ status: 404, description: 'Entrada inexistente o no pertenece al usuario' })
    remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
        return this.libraryEntriesService.remove(user.id, id);
    }
}
