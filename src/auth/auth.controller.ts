import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiAuthenticated } from '../common/swagger/api-protected.decorator.js';

import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { UserLoginDto } from './dto/user-login.dto.js';
import { User } from './entities/user.entity.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface.js';
import { RegisterUserDto } from './user/dto/register-user.dto.js';
import { UserResponseDto } from './user/dto/user-response.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Registrar un usuario', description: 'Crea una cuenta con el rol USER. El rol no se acepta del cliente.' })
    @ApiCreatedResponse({ description: 'Usuario creado (sin contraseña)', type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiConflictResponse({ description: 'El correo o el nombre de usuario ya están en uso' })
    register(@Body() registerDto: RegisterUserDto): Promise<User> {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Iniciar sesión', description: 'Devuelve un JWT (con jti único) y los datos básicos del usuario.' })
    @ApiOkResponse({ description: 'Sesión iniciada', type: LoginResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos (falla la validación del DTO)' })
    @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
    login(@Body() userLoginDto: UserLoginDto): Promise<LoginResponseDto> {
        return this.authService.login(userLoginDto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiAuthenticated()
    @ApiOperation({ summary: 'Cerrar sesión', description: 'Revoca el token actual: deja de ser válido aunque no haya expirado.' })
    @ApiNoContentResponse({ description: 'Token revocado' })
    logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
        return this.authService.logout(user);
    }

    @Get('me')
    @ApiAuthenticated()
    @ApiOperation({ summary: 'Perfil del usuario autenticado' })
    @ApiOkResponse({ type: UserResponseDto })
    me(@CurrentUser() user: AuthenticatedUser): Promise<User> {
        return this.authService.me(user);
    }
}
