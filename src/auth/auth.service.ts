import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { isUniqueViolation } from '../common/database/pg-errors.js';
import { UserNotFoundException } from '../common/exceptions/index.js';

import { DEFAULT_ROLE_NAME, SOCKET_TOKEN } from './constants/auth.constants.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { SocketTokenResponseDto } from './dto/socket-token-response.dto.js';
import { UserLoginDto } from './dto/user-login.dto.js';
import { RevokedToken } from './entities/revoked-token.entity.js';
import { User } from './entities/user.entity.js';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { SocketUser } from './interfaces/socket-user.interface.js';
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
        private readonly events: EventEmitter2,
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
        await this.events.emitAsync('auth.logout', { jti: user.jti });
        // Limpieza oportunista: los tokens ya expirados no necesitan seguir en la lista
        await this.revokedTokenRepository.delete({ expiresAt: LessThan(new Date()) });
    }

    async isRevoked(jti: string): Promise<boolean> {
        return await this.revokedTokenRepository.existsBy({ jti });
    }

    async me(user: AuthenticatedUser): Promise<User> {
        return await this.usersService.findOne(user.id, true);
    }

    /**
     * Ticket para el handshake del WebSocket: JWT corto (60 s), de un solo uso y con audiencia 'socket'.
     * Así el navegador nunca recibe el token de sesión (que vive en una cookie httpOnly del frontend).
     */
    issueSocketToken(user: AuthenticatedUser): SocketTokenResponseDto {
        const payload: Pick<JwtPayload, 'sub' | 'email' | 'typ' | 'sessionJti' | 'sessionExp'> = {
            sub: String(user.id),
            email: user.email,
            typ: SOCKET_TOKEN.TYPE,
            sessionJti: user.jti,
            sessionExp: user.tokenExp,
        };
        return {
            token: this.jwtService.sign(payload, {
                jwtid: randomUUID(),
                audience: SOCKET_TOKEN.AUDIENCE,
                expiresIn: SOCKET_TOKEN.TTL_SECONDS,
            }),
            expiresIn: SOCKET_TOKEN.TTL_SECONDS,
        };
    }

    /**
     * Valida el ticket de un handshake de Socket.IO y lo consume (no se puede reutilizar).
     * Devuelve el usuario con rol y permisos leídos de la BD. Lanza 401 si algo falla.
     */
    async verifySocketToken(token: string | undefined): Promise<SocketUser> {
        if (!token) {
            throw new UnauthorizedException('Falta el ticket del socket');
        }

        let payload: JwtPayload;
        try {
            payload = await this.jwtService.verifyAsync<JwtPayload>(token, { audience: SOCKET_TOKEN.AUDIENCE });
        } catch {
            throw new UnauthorizedException('El ticket del socket es inválido o expiró');
        }
        if (payload.typ !== SOCKET_TOKEN.TYPE || !payload.jti) {
            throw new UnauthorizedException('El ticket del socket es inválido o expiró');
        }

        if (!payload.sessionJti || !payload.sessionExp || payload.sessionExp <= Math.floor(Date.now() / 1000)) {
            throw new UnauthorizedException('La sesión del socket expiró');
        }
        if (await this.isRevoked(payload.sessionJti)) {
            throw new UnauthorizedException('La sesión del socket fue revocada');
        }

        await this.consumeSocketToken(payload);

        const user = await this.usersService.findOne(Number(payload.sub), true).catch((error: unknown) => {
            if (error instanceof UserNotFoundException) {
                throw new UnauthorizedException('El ticket no corresponde a un usuario activo');
            }
            throw error;
        });
        if (!user.isActive) {
            throw new UnauthorizedException('La cuenta está desactivada');
        }

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role.name,
            permissions: user.role.rolePermissions?.map((rp) => rp.permission.name) ?? [],
            sessionJti: payload.sessionJti,
            tokenExp: payload.sessionExp,
        };
    }

    /** Un solo uso: el jti se guarda en revoked_tokens; si ya estaba (índice único), el ticket se reutilizó. */
    private async consumeSocketToken(payload: JwtPayload): Promise<void> {
        try {
            await this.revokedTokenRepository.insert({
                jti: payload.jti,
                expiresAt: new Date((payload.exp ?? 0) * 1000),
            });
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new UnauthorizedException('El ticket del socket ya fue usado');
            }
            throw error;
        }
    }
}
