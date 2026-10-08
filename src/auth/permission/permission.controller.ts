import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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

import { PositiveIntPipe } from '../../common/pipes/positive-int-pipe.js';
import { ApiRequiresPermission } from '../../common/swagger/api-protected.decorator.js';
import { PERMISSIONS } from '../constants/auth.constants.js';
import { Permissions } from '../decorators/permissions.decorator.js';
import { Permission } from '../entities/permission.entity.js';

import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { PermissionResponseDto } from './dto/permission-response.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';
import { PermissionService } from './permission.service.js';

const ID_PARAM = { name: 'id', description: 'Id del permiso', example: 1 };

@ApiTags('Permissions')
@Permissions(PERMISSIONS.PERMISSIONS_MANAGE)
@ApiRequiresPermission(PERMISSIONS.PERMISSIONS_MANAGE)
@Controller('permissions')
export class PermissionController {
    constructor(private readonly permissionService: PermissionService) {}

    @Post()
    @ApiOperation({ summary: 'Crear un permiso' })
    @ApiCreatedResponse({ type: PermissionResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiConflictResponse({ description: 'Ya existe un permiso con ese nombre' })
    create(@Body() createPermissionDto: CreatePermissionDto): Promise<Permission> {
        return this.permissionService.create(createPermissionDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar permisos' })
    @ApiOkResponse({ type: [PermissionResponseDto] })
    findAll(): Promise<Permission[]> {
        return this.permissionService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Detalle de un permiso' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: PermissionResponseDto })
    @ApiBadRequestResponse({ description: 'El id no es un entero positivo' })
    @ApiNotFoundResponse({ description: 'El permiso no existe' })
    findOne(@Param('id', PositiveIntPipe) id: number): Promise<Permission> {
        return this.permissionService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Editar un permiso' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: PermissionResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiNotFoundResponse({ description: 'El permiso no existe' })
    @ApiConflictResponse({ description: 'Ya existe un permiso con ese nombre' })
    update(
        @Param('id', PositiveIntPipe) id: number,
        @Body() updatePermissionDto: UpdatePermissionDto,
    ): Promise<Permission> {
        return this.permissionService.update(id, updatePermissionDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un permiso', description: 'También lo retira de los roles que lo tenían.' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ description: 'Permiso eliminado' })
    @ApiNotFoundResponse({ description: 'El permiso no existe' })
    remove(@Param('id', PositiveIntPipe) id: number): Promise<{ message: string }> {
        return this.permissionService.remove(id);
    }
}
