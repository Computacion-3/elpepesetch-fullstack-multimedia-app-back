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
import { ApiAuthenticated, ApiRequiresPermission } from '../../common/swagger/api-protected.decorator.js';
import { PERMISSIONS } from '../constants/auth.constants.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Permissions } from '../decorators/permissions.decorator.js';
import { User } from '../entities/user.entity.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

import { AssignRoleDto } from './dto/assign-role.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserService } from './user.service.js';

const ID_PARAM = { name: 'id', description: 'Id del usuario', example: 1 };

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    // --- Recurso propio: cualquier usuario autenticado, solo sobre su propia cuenta ---

    @Patch('me')
    @ApiAuthenticated()
    @ApiOperation({
        summary: 'Editar el perfil propio',
        description: 'Solo afecta a la cuenta del token. No permite cambiar el rol.',
    })
    @ApiOkResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiConflictResponse({ description: 'El correo o el nombre de usuario ya están en uso' })
    updateMe(@CurrentUser() currentUser: AuthenticatedUser, @Body() updateProfileDto: UpdateProfileDto): Promise<User> {
        return this.userService.updateProfile(currentUser.id, updateProfileDto);
    }

    // --- Administración: requiere el permiso users:manage ---

    @Post()
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({ summary: 'Crear un usuario con el rol indicado (administrador)' })
    @ApiCreatedResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiNotFoundResponse({ description: 'El rol indicado no existe' })
    @ApiConflictResponse({ description: 'El correo o el nombre de usuario ya están en uso' })
    create(@Body() createUserDto: CreateUserDto): Promise<User> {
        return this.userService.create(createUserDto);
    }

    @Get()
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({ summary: 'Listar usuarios (administrador)' })
    @ApiOkResponse({ type: [UserResponseDto] })
    findAll(): Promise<User[]> {
        return this.userService.findAll();
    }

    @Get(':id')
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({ summary: 'Detalle de un usuario (administrador)' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'El id no es un entero positivo' })
    @ApiNotFoundResponse({ description: 'El usuario no existe' })
    findOne(@Param('id', PositiveIntPipe) id: number): Promise<User> {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({ summary: 'Editar cualquier usuario (administrador)' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiNotFoundResponse({ description: 'El usuario o el rol no existen' })
    @ApiConflictResponse({ description: 'El correo o el nombre de usuario ya están en uso' })
    update(@Param('id', PositiveIntPipe) id: number, @Body() updateUserDto: UpdateUserDto): Promise<User> {
        return this.userService.update(id, updateUserDto);
    }

    @Patch(':id/roles')
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({ summary: 'Asignar un rol a un usuario (administrador)' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiNotFoundResponse({ description: 'El usuario o el rol no existen' })
    assignRole(@Param('id', PositiveIntPipe) id: number, @Body() assignRoleDto: AssignRoleDto): Promise<User> {
        return this.userService.assignRole(id, assignRoleDto.roleId);
    }

    @Patch(':id/status')
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({
        summary: 'Activar o desactivar una cuenta (administrador)',
        description:
            'Una cuenta desactivada no puede iniciar sesión y sus tokens vigentes dejan de ser válidos. Los datos se conservan.',
    })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos, o intento de desactivar la propia cuenta' })
    @ApiNotFoundResponse({ description: 'El usuario no existe' })
    updateStatus(
        @Param('id', PositiveIntPipe) id: number,
        @Body() updateUserStatusDto: UpdateUserStatusDto,
        @CurrentUser() currentUser: AuthenticatedUser,
    ): Promise<User> {
        return this.userService.setStatus(id, updateUserStatusDto.isActive, currentUser.id);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.USERS_MANAGE)
    @ApiRequiresPermission(PERMISSIONS.USERS_MANAGE)
    @ApiOperation({ summary: 'Eliminar un usuario (administrador)' })
    @ApiParam(ID_PARAM)
    @ApiOkResponse({ description: 'Usuario eliminado' })
    @ApiNotFoundResponse({ description: 'El usuario no existe' })
    remove(@Param('id', PositiveIntPipe) id: number): Promise<{ message: string }> {
        return this.userService.remove(id);
    }
}
