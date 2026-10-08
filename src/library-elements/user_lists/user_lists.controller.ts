import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
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
import { ApiAuthenticated } from '../../common/swagger/api-protected.decorator.js';
import { UserListsService } from './user_lists.service.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { ListQueryDto } from './dto/list-query.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';

@Controller('lists')
@ApiAuthenticated()
@ApiTags('Lists')
export class UserListsController {
    constructor(private readonly userListsService: UserListsService) {}

    @Post()
    @ApiOperation({ summary: 'Crear una lista personal' })
    @ApiBody({ type: CreateUserListDto })
    @ApiResponse({ status: 201, description: 'Lista creada' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 409, description: 'Nombre duplicado para el propietario' })
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserListDto) {
        return this.userListsService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Consultar las listas propias' })
    @ApiResponse({ status: 200, description: 'Listas propias' })
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.userListsService.findAll(user.id);
    }

    @Get('public')
    @ApiOperation({ summary: 'Consultar listas públicas de otros usuarios' })
    @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, default: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 50, default: 10 })
    @ApiResponse({ status: 200, description: 'Listas públicas paginadas con username del propietario' })
    @ApiBadRequestResponse({ description: 'Parámetros de paginación inválidos' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    findPublic(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
        return this.userListsService.findPublic(user.id, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Consultar una lista visible' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Lista encontrada' })
    @ApiResponse({ status: 404, description: 'Lista inexistente o privada no visible' })
    findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
        return this.userListsService.findOne(user.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Modificar una lista propia' })
    @ApiBody({ type: UpdateUserListDto })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Lista actualizada' })
    @ApiResponse({ status: 403, description: 'La lista pertenece a otro usuario' })
    @ApiResponse({ status: 404, description: 'Lista inexistente' })
    @ApiResponse({ status: 409, description: 'Nombre duplicado' })
    update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUserListDto) {
        return this.userListsService.update(user.id, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar una lista propia' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 204, description: 'Lista eliminada' })
    @ApiResponse({ status: 403, description: 'La lista pertenece a otro usuario' })
    @ApiResponse({ status: 404, description: 'Lista inexistente' })
    remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
        return this.userListsService.remove(user.id, id);
    }

    @Post(':id/items')
    @ApiOperation({ summary: 'Agregar un MediaItem aprobado a una lista' })
    @ApiBody({ type: AddListItemDto })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 201, description: 'Elemento agregado' })
    @ApiResponse({ status: 400, description: 'MediaItem no aprobado' })
    @ApiResponse({ status: 403, description: 'La lista pertenece a otro usuario' })
    @ApiResponse({ status: 404, description: 'Lista o MediaItem inexistente' })
    @ApiResponse({ status: 409, description: 'Elemento duplicado' })
    addItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddListItemDto) {
        return this.userListsService.addItem(user.id, id, dto);
    }

    @Delete(':id/items/:mediaItemId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un MediaItem de una lista propia' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiParam({ name: 'mediaItemId', format: 'uuid' })
    @ApiResponse({ status: 204, description: 'Elemento eliminado' })
    @ApiResponse({ status: 403, description: 'La lista pertenece a otro usuario' })
    @ApiResponse({ status: 404, description: 'Lista o elemento inexistente' })
    removeItem(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
        @Param('mediaItemId') mediaItemId: string,
    ) {
        return this.userListsService.removeItem(user.id, id, mediaItemId);
    }
}
