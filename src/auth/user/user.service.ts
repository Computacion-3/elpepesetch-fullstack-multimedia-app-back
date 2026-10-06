import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { isUniqueViolation } from '../../common/database/pg-errors.js';
import { UserNotFoundException } from '../../common/exceptions/index.js';
import { Role } from '../entities/role.entity.js';
import { User } from '../entities/user.entity.js';
import { RoleService } from '../role/role.service.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly roleService: RoleService,
        private readonly configService: ConfigService,
    ) {}

    /** Creación por un administrador: el rol viene en el DTO. */
    async create(createUserDto: CreateUserDto): Promise<User> {
        const { roleId, ...userData } = createUserDto;
        const role = await this.roleService.findOne(roleId);
        return await this.createWithRole(userData, role);
    }

    /** Registro público: el rol lo decide el servidor, nunca el cliente. */
    async createWithRole(userData: RegisterUserDto, role: Role): Promise<User> {
        const { password, ...rest } = userData;
        const user = this.userRepository.create({
            ...rest,
            passwordHash: await this.hashPassword(password),
            role,
        });
        return await this.saveOrConflict(user);
    }

    async findAll(): Promise<User[]> {
        return await this.userRepository.find({
            relations: { role: true },
        });
    }

    async findOne(id: number, relations: boolean = false): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: { role: relations ? { rolePermissions: { permission: true } } : false },
        });
        if (!user) {
            throw new UserNotFoundException(id);
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { email },
            relations: {
                role: {
                    rolePermissions: {
                        permission: true,
                    },
                },
            },
        });
        return user || null;
    }

    /** Edición por un administrador (puede cambiar el rol). */
    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);
        const { roleId, ...userData } = updateUserDto;

        if (roleId !== undefined) {
            user.role = await this.roleService.findOne(roleId);
        }
        return await this.applyProfileChanges(user, userData);
    }

    /** Edición del propio perfil: por construcción nunca toca el rol. */
    async updateProfile(id: number, updateProfileDto: UpdateProfileDto): Promise<User> {
        const user = await this.findOne(id);
        return await this.applyProfileChanges(user, updateProfileDto);
    }

    async assignRole(id: number, roleId: number): Promise<User> {
        const user = await this.findOne(id);
        user.role = await this.roleService.findOne(roleId);
        return await this.saveOrConflict(user);
    }

    /** Activa o desactiva una cuenta. Un administrador no puede desactivar la suya (evita quedarse sin acceso). */
    async setStatus(id: number, isActive: boolean, actorId: number): Promise<User> {
        if (!isActive && id === actorId) {
            throw new BadRequestException('No puedes desactivar tu propia cuenta');
        }
        const user = await this.findOne(id);
        user.isActive = isActive;
        return await this.saveOrConflict(user);
    }

    async remove(id: number): Promise<{ message: string }> {
        const user = await this.findOne(id);
        await this.userRepository.remove(user);
        return { message: `User with id #${id} deleted successfully` };
    }

    private async applyProfileChanges(user: User, { password, ...data }: UpdateProfileDto): Promise<User> {
        if (password !== undefined) {
            user.passwordHash = await this.hashPassword(password);
        }
        this.userRepository.merge(user, data);
        return await this.saveOrConflict(user);
    }

    private async hashPassword(password: string): Promise<string> {
        const saltRounds = parseInt(this.configService.get<string>('SALT_QTY') ?? '10', 10);
        return await bcrypt.hash(password, saltRounds);
    }

    private async saveOrConflict(user: User): Promise<User> {
        try {
            return await this.userRepository.save(user);
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictException('El correo electrónico o el nombre de usuario ya están en uso');
            }
            throw error;
        }
    }
}
