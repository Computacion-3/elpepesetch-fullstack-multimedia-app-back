import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { isForeignKeyViolation, isUniqueViolation } from '../../common/database/pg-errors.js';
import { RoleNotFoundException } from '../../common/exceptions/index.js';
import { Permission } from '../entities/permission.entity.js';
import { RolePermission } from '../entities/role-permission.entity.js';
import { Role } from '../entities/role.entity.js';

import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
    ) {}

    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        const role = this.roleRepository.create(createRoleDto);
        return await this.saveOrConflict(role);
    }

    async findAll(): Promise<Role[]> {
        return await this.roleRepository.find({
            relations: { rolePermissions: true },
        });
    }

    async findOne(id: number): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id },
            relations: {
                rolePermissions: {
                    permission: true,
                },
            },
        });
        if (!role) {
            throw new RoleNotFoundException(id);
        }
        return role;
    }

    async findByName(name: string): Promise<Role | null> {
        return await this.roleRepository.findOne({ where: { name } });
    }

    async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
        const role = await this.findOne(id);
        this.roleRepository.merge(role, updateRoleDto);
        return await this.saveOrConflict(role);
    }

    /** Reemplaza el conjunto de permisos del rol de forma atómica. */
    async setPermissions(id: number, permissionIds: number[]): Promise<Role> {
        const role = await this.findOne(id);
        const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
        if (permissions.length !== new Set(permissionIds).size) {
            throw new BadRequestException('Uno o más permisos indicados no existen');
        }

        await this.roleRepository.manager.transaction(async (manager) => {
            await manager.createQueryBuilder().delete().from(RolePermission).where('role_id = :id', { id }).execute();
            if (permissions.length > 0) {
                await manager.save(
                    RolePermission,
                    permissions.map((permission) => manager.create(RolePermission, { role, permission })),
                );
            }
        });
        return await this.findOne(id);
    }

    async remove(id: number): Promise<{ message: string }> {
        const role = await this.findOne(id);
        try {
            await this.roleRepository.remove(role);
        } catch (error) {
            if (isForeignKeyViolation(error)) {
                throw new ConflictException('No se puede eliminar un rol que tiene usuarios asignados');
            }
            throw error;
        }
        return { message: `Role with id #${id} deleted successfully` };
    }

    private async saveOrConflict(role: Role): Promise<Role> {
        try {
            return await this.roleRepository.save(role);
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictException('Ya existe un rol con ese nombre');
            }
            throw error;
        }
    }
}
