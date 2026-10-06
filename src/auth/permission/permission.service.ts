import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { isUniqueViolation } from '../../common/database/pg-errors.js';
import { Permission } from '../entities/permission.entity.js';

import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';

@Injectable()
export class PermissionService {
    constructor(
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
    ) {}

    async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
        return await this.saveOrConflict(this.permissionRepository.create(createPermissionDto));
    }

    async findAll(): Promise<Permission[]> {
        return await this.permissionRepository.find();
    }

    async findOne(id: number): Promise<Permission> {
        const permission = await this.permissionRepository.findOne({ where: { id } });
        if (!permission) {
            throw new NotFoundException(`El permiso con identificador ${id} no existe.`);
        }
        return permission;
    }

    async update(id: number, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
        const permission = await this.findOne(id);
        this.permissionRepository.merge(permission, updatePermissionDto);
        return await this.saveOrConflict(permission);
    }

    async remove(id: number): Promise<{ message: string }> {
        const permission = await this.findOne(id);
        await this.permissionRepository.remove(permission);
        return { message: `Permission with id #${id} deleted successfully` };
    }

    private async saveOrConflict(permission: Permission): Promise<Permission> {
        try {
            return await this.permissionRepository.save(permission);
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictException('Ya existe un permiso con ese nombre');
            }
            throw error;
        }
    }
}
