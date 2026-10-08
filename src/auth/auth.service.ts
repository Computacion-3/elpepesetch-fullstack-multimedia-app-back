import { randomUUID } from 'crypto';

import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { DEFAULT_ROLE_NAME } from './constants/auth.constants.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { UserLoginDto } from './dto/user-login.dto.js';
import { RevokedToken } from './entities/revoked-token.entity.js';
import { User } from './entities/user.entity.js';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { RoleService } from './role/role.service.js';
import { RegisterUserDto } from './user/dto/register-user.dto.js';
import { UserService } from './user/user.service.js';

// Hash bcrypt de una contraseña inexistente: se compara cuando el correo no existe
// para que el tiempo de respuesta no revele qué correos están registrados.
const DUMMY_HASH = '$2b$10$RXnYcard1YkA9J/ZH.Y/3eitwGEkM43aguq.CEL6wBqOkc0ul5ssG';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UserService,
        private readonly roleService: RoleService,
        private readonly jwtService: JwtService,
        @InjectRepository(RevokedToken)
        private readonly revokedTokenRepository: Repository<RevokedToken>,
    ) {}

    /** Registro público: siempre crea al usuario con el rol por defecto. */
    async register(registerDto: RegisterUserDto): Promise<User> {
        const role = await this.roleService.findByName(DEFAULT_ROLE_NAME);
        if (!role) {
            throw new InternalServerErrorException(`El rol por defecto '${DEFAULT_ROLE_NAME}' no está configurado`);
        }
        return await this.usersService.createWithRole(registerDto, role);
    }

    async validateUser(email: string, pass: string): Promise<User> {
        const user = await this.usersService.findByEmail(email);
        // Misma respuesta (y costo) para correo inexistente y contraseña errónea
        const isMatch = await bcrypt.compare(pass, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !isMatch) {
            throw new UnauthorizedException('Credenciales inválidas');
        }
        // Solo se revela tras verificar la contraseña, para no filtrar qué correos existen
        if (!user.isActive) {
            throw new UnauthorizedException('La cuenta está desactivada');
        }
        return user;
    }

    async login(userLoginDto: UserLoginDto): Promise<LoginResponseDto> {
        const user = await this.validateUser(userLoginDto.email, userLoginDto.password);

        const payload: Pick<JwtPayload, 'sub' | 'email'> = {
            sub: String(user.id),
            email: user.email,
        };

        return {
            accessToken: this.jwtService.sign(payload, { jwtid: randomUUID() }),
            tokenType: 'Bearer',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role.name,
            },
        };
    }

    /** Revoca el token presentado: deja de ser válido aunque no haya expirado. */
    async logout(user: AuthenticatedUser): Promise<void> {
        await this.revokedTokenRepository.upsert(
            { jti: user.jti, expiresAt: new Date(user.tokenExp * 1000) },
            { conflictPaths: ['jti'] },
        );
        // Limpieza oportunista: los tokens ya expirados no necesitan seguir en la lista
        await this.revokedTokenRepository.delete({ expiresAt: LessThan(new Date()) });
    }

    async isRevoked(jti: string): Promise<boolean> {
        return await this.revokedTokenRepository.existsBy({ jti });
    }

    async me(user: AuthenticatedUser): Promise<User> {
        return await this.usersService.findOne(user.id, true);
    }
}
