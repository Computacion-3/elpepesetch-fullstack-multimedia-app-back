import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
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
import { Role } from '../entities/role.entity.js';

import { CreateRoleDto } from './dto/create-role.dto.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RoleService } from './role.service.js';

const ID_PARAM = { name: 'id', description: 'Id del rol', example: 1 };

@ApiTags('Roles')
@Permissions(PERMISSIONS.ROLES_MANAGE)
@ApiRequiresPermission(PERMISSIONS.ROLES_MANAGE)
@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Post()
    @ApiOperation({ summary: 'Crear un rol' })
    @ApiCreatedResponse({ type: RoleResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiConflictResponse({ description: 'Ya existe un rol con ese nombre' })
    create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
        return this.roleService.create(createRoleDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar roles' })
    @ApiOkResponse({ type: [RoleResponseDto] })
    findAll(): Promise<Role[]> {
        return this.roleService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Detalle de un rol con sus permisos' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: RoleResponseDto })
    @ApiBadRequestResponse({ description: 'El id no es un entero positivo' })
    @ApiNotFoundResponse({ description: 'El rol no existe' })
    findOne(@Param('id', PositiveIntPipe) id: number): Promise<Role> {
        return this.roleService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Editar un rol' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: RoleResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiNotFoundResponse({ description: 'El rol no existe' })
    @ApiConflictResponse({ description: 'Ya existe un rol con ese nombre' })
    update(@Param('id', PositiveIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto): Promise<Role> {
        return this.roleService.update(id, updateRoleDto);
    }

    @Put(':id/permissions')
    @ApiOperation({ summary: 'Definir los permisos de un rol', description: 'Reemplaza el conjunto de permisos del rol.' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: RoleResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos o algún permiso no existe' })
    @ApiNotFoundResponse({ description: 'El rol no existe' })
    setPermissions(
        @Param('id', PositiveIntPipe) id: number,
        @Body() setRolePermissionsDto: SetRolePermissionsDto,
    ): Promise<Role> {
        return this.roleService.setPermissions(id, setRolePermissionsDto.permissionIds);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un rol' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ description: 'Rol eliminado' })
    @ApiNotFoundResponse({ description: 'El rol no existe' })
    @ApiConflictResponse({ description: 'El rol tiene usuarios asignados' })
    remove(@Param('id', PositiveIntPipe) id: number): Promise<{ message: string }> {
        return this.roleService.remove(id);
    }
}
