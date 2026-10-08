import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { RolePermission } from './role-permission.entity.js';
import { User } from './user.entity.js';
import { UserRole } from './user-role.entity.js';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 50 })
    name: string;

    @Column({ length: 255 })
    description: string;

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
    rolePermissions: RolePermission[];

    @OneToMany(() => User, (user) => user.role) // One-to-many relationship with User entity, meaning that a role can be assigned to many users, but each user can have only one role
    users: User[];

    @OneToMany(() => UserRole, (userRole) => userRole.role) // One-to-many relationship with UserRole entity, meaning that a role can be associated with many user-role relationships, but each user-role relationship is associated with one role
    userRoles: UserRole[]; // This property represents the user-role relationships associated with the role, is an array of UserRole because it's a one-to-many relationship
}
